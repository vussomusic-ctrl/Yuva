import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Modal, Keyboard, Platform, StyleSheet, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../lib/theme/ThemeContext";
import { brand, tints } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { useLanguage } from "../lib/i18n/languages";
import { useFilters } from "../lib/filters-state";
import { Place, placeById, placeName, areasOf, RAYONS, METRO } from "../lib/places";
import { POPULAR, searchPlaces, matchPlace, isBakuId } from "../lib/placeSearch";
import { foldSearch } from "../lib/normalize";
import { getRecentSearchIds, addRecentSearch } from "../lib/recentSearches";
import { usePressShrink, useOverlayEntrance } from "../lib/animations";

type Lang = "az" | "ru" | "en";
type Props = { visible: boolean; frame: { x: number; y: number; w: number } | null; autoFocusOnOpen: boolean; onClose: () => void };

const resolveIds = (ids: string[]): Place[] => ids.map((id) => placeById(id)).filter((p): p is Place => !!p);

/**
 * Search takeover launched from the Home pill. Autofocused input over a glassy
 * dropdown panel (home stays recognisable behind a light scrim). Empty query →
 * Recent + Popular; typing → live place suggestions. Tapping Baku drills into its
 * rayons + metro IN THE SAME PANEL; any leaf pick sets the location filter and
 * jumps to /search (other filters preserved — same shape as Home's goPreset).
 */
export function SearchTakeover({ visible, frame, autoFocusOnOpen, onClose }: Props) {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const { current: lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const router = useRouter();
  const { filters, apply } = useFilters();

  // Keep the Modal mounted through the exit animation (~180ms) after visible→false.
  const [render, setRender] = useState(visible);
  useEffect(() => {
    if (visible) { setRender(true); return; }
    const id = setTimeout(() => setRender(false), 200);
    return () => clearTimeout(id);
  }, [visible]);

  // Live keyboard height → recompute the panel's maxHeight (no KeyboardAvoidingView
  // since the input/panel are absolutely positioned).
  const [kbH, setKbH] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, (e) => setKbH(e.endCoordinates.height));
    const h = Keyboard.addListener(hideEvt, () => setKbH(0));
    return () => { s.remove(); h.remove(); };
  }, []);

  // Cancel button width (+12 gap) reserved as the pill shrinks. Measured on layout.
  const [cancelReserve, setCancelReserve] = useState(88);

  // Entrance: the row is born pixel-identical to the pill (frame) and eases to the
  // 16pt margins; the pill shrinks to reveal Cancel; the panel drops under it.
  const opts = frame
    ? { fromLeft: frame.x, fromRight: Math.max(winW - frame.x - frame.w, 16), cancelReserve }
    : null;
  const { rowStyle, pillStyle, cancelStyle, backdropStyle, panelStyle } = useOverlayEntrance(visible, opts);
  const baseTop = frame?.y ?? insets.top + 8; // overlay input Y (pill position)
  const panelTop = baseTop + 50 + 8; // under the 50-tall input + 8 gap
  const bottomGap = Math.max(insets.bottom + 16, kbH + 16);
  const panelMaxHeight = Math.max(120, winH - panelTop - bottomGap);

  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<Place[]>([]);
  const [drill, setDrill] = useState<string | null>(null); // region id being drilled (Baku)
  const [selRegions, setSelRegions] = useState<string[]>([]); // multi-selected area ids
  const [selMetro, setSelMetro] = useState<string[]>([]); // multi-selected metro ids
  const inputRef = useRef<TextInput>(null);

  // On open: reset query + drill + selection, (re)load recent. (drill does NOT reset selection.)
  useEffect(() => {
    if (!visible) return;
    setQ("");
    setDrill(null);
    setSelRegions([]);
    setSelMetro([]);
    getRecentSearchIds().then((ids) => setRecent(resolveIds(ids)));
  }, [visible]);

  const typing = q.trim() !== "";
  const folded = foldSearch(q.trim());
  const results = useMemo(() => searchPlaces(q), [q]);
  const popular = useMemo(() => resolveIds(POPULAR), []);
  const hasResults = results.regions.length + results.zones.length + results.metro.length > 0;

  const drillRegion = drill ? placeById(drill) : null;
  const drillZones = useMemo(() => {
    if (!drill) return [] as Place[];
    return typing ? areasOf(drill).filter((p) => matchPlace(p, folded)) : RAYONS;
  }, [drill, typing, folded]);
  const drillMetro = useMemo(() => {
    if (!drill || !isBakuId(drill)) return [] as Place[];
    return typing ? METRO.filter((p) => matchPlace(p, folded)) : METRO;
  }, [drill, typing, folded]);
  const drillHasResults = drillZones.length + drillMetro.length > 0;

  const pillBg = mode === "dark" ? "rgba(255,255,255,0.08)" : "#FFFFFF";

  const finish = (p: Place) => {
    const patch = p.kind === "metro" ? { metro: [p.id], regions: [] } : { regions: [p.id], metro: [] };
    apply({ ...filters, ...patch });
    addRecentSearch(p.id);
    Keyboard.dismiss();
    onClose();
    router.navigate("/search");
  };

  const selCount = selRegions.length + selMetro.length;
  const isSelected = (p: Place) => (p.kind === "metro" ? selMetro.includes(p.id) : selRegions.includes(p.id));
  const toggleSel = (p: Place) => {
    const set = p.kind === "metro" ? setSelMetro : setSelRegions;
    set((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id]));
  };

  // Row tap: a region with children (Baku) drills in; a childless region applies
  // instantly (single); a rayon/zone/metro toggles into the multi-selection.
  const onRowTap = (p: Place) => {
    if (!drill && p.kind === "region" && areasOf(p.id).length > 0) {
      setDrill(p.id);
      setQ("");
      return;
    }
    if (p.kind === "region") { finish(p); return; }
    toggleSel(p);
  };

  // "Показать (N)" — apply the whole multi-selection at once.
  const showSelection = () => {
    apply({ ...filters, regions: selRegions, metro: selMetro });
    [...selRegions, ...selMetro].forEach((id) => addRecentSearch(id));
    Keyboard.dismiss();
    onClose();
    router.navigate("/search");
  };

  return (
    <Modal visible={render} transparent statusBarTranslucent animationType="none" onRequestClose={onClose} onShow={() => { if (autoFocusOnOpen) inputRef.current?.focus(); }}>
      <View style={{ flex: 1 }}>
        {/* Scrim — home stays recognisable behind; tap outside the panel closes. Fades. */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
            <BlurView intensity={12} tint={mode === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: mode === "dark" ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.18)" }]} />
          </Pressable>
        </Animated.View>

        {/* Input row — born on the pill's exact frame, eases to the 16pt margins */}
        <Animated.View style={[{ position: "absolute", top: baseTop, flexDirection: "row", alignItems: "center" }, rowStyle]}>
          {/* Pill — 1:1 with the real Home pill (icon / placeholder / filter button) */}
          <Animated.View style={[{ flex: 1, flexDirection: "row", alignItems: "center", height: 50, borderRadius: 25, backgroundColor: pillBg, paddingHorizontal: 14, gap: 10 }, pillStyle]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              ref={inputRef}
              autoFocus={autoFocusOnOpen}
              value={q}
              onChangeText={setQ}
              placeholder={t("home.heroSearchPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              style={{ flex: 1, color: colors.text, fontFamily: font.regular, fontSize: 14 }}
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
            <Pressable
              onPress={() => { onClose(); router.push({ pathname: "/filters", params: { from: "home" } }); }}
              hitSlop={8}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 12, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 })}
            >
              <Ionicons name="options-outline" size={18} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
          {/* Cancel — slides/fades in at the right as the pill shrinks */}
          <Animated.View
            onLayout={(e) => setCancelReserve(e.nativeEvent.layout.width + 12)}
            style={[{ position: "absolute", right: 0, height: 50, justifyContent: "center" }, cancelStyle]}
          >
            <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 15 }}>{t("common.cancel")}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* Glass panel — dropdown under the input; fades in + drops a touch later */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: panelTop,
              left: 16,
              right: 16,
              maxHeight: panelMaxHeight,
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 8,
            },
            panelStyle,
          ]}
        >
            <BlurView intensity={45} tint={mode === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: mode === "dark" ? "rgba(28,28,30,0.6)" : "rgba(255,255,255,0.6)" }]} />

            <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              {drill && drillRegion ? (
                <>
                  <Pressable onPress={() => { setDrill(null); setQ(""); }} hitSlop={6} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, opacity: pressed ? 0.6 : 1 })}>
                    <Ionicons name="chevron-back" size={20} color={brand.violet} />
                    <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 16 }}>{t("searchTakeover.back")} · {placeName(drillRegion, lang)}</Text>
                  </Pressable>

                  {!typing && <WholeRow label={t("searchTakeover.all", { name: placeName(drillRegion, lang) })} colors={colors} onPress={() => finish(drillRegion)} />}

                  {typing && !drillHasResults ? (
                    <EmptyRow label={t("searchTakeover.empty")} colors={colors} />
                  ) : (
                    <>
                      {drillZones.length > 0 && <SectionHeader label={t("searchTakeover.districts")} colors={colors} />}
                      {drillZones.map((p) => (
                        <PlaceRow key={`dz-${p.id}`} place={p} lang={lang} colors={colors} selected={isSelected(p)} onPress={() => onRowTap(p)} t={t} />
                      ))}
                      {drillMetro.length > 0 && <SectionHeader label={t("searchTakeover.metro")} colors={colors} />}
                      {drillMetro.map((p) => (
                        <PlaceRow key={`dm-${p.id}`} place={p} lang={lang} colors={colors} selected={isSelected(p)} onPress={() => onRowTap(p)} t={t} />
                      ))}
                    </>
                  )}
                </>
              ) : !typing ? (
                <>
                  {recent.length > 0 && (
                    <>
                      <SectionHeader label={t("searchTakeover.recent")} colors={colors} />
                      {recent.map((p) => (
                        <PlaceRow key={`r-${p.id}`} place={p} lang={lang} colors={colors} selected={isSelected(p)} onPress={() => onRowTap(p)} t={t} />
                      ))}
                    </>
                  )}
                  <SectionHeader label={t("searchTakeover.popular")} colors={colors} />
                  {popular.map((p) => (
                    <PlaceRow key={`p-${p.id}`} place={p} lang={lang} colors={colors} selected={isSelected(p)} onPress={() => onRowTap(p)} t={t} />
                  ))}
                </>
              ) : hasResults ? (
                <>
                  {results.regions.length > 0 && <SectionHeader label={t("searchTakeover.regions")} colors={colors} />}
                  {results.regions.map((p) => (
                    <PlaceRow key={`reg-${p.id}`} place={p} lang={lang} colors={colors} selected={isSelected(p)} onPress={() => onRowTap(p)} t={t} />
                  ))}
                  {results.zones.length > 0 && <SectionHeader label={t("searchTakeover.zones")} colors={colors} />}
                  {results.zones.map((p) => (
                    <PlaceRow key={`z-${p.id}`} place={p} lang={lang} colors={colors} selected={isSelected(p)} onPress={() => onRowTap(p)} t={t} />
                  ))}
                  {results.metro.length > 0 && <SectionHeader label={t("searchTakeover.metro")} colors={colors} />}
                  {results.metro.map((p) => (
                    <PlaceRow key={`m-${p.id}`} place={p} lang={lang} colors={colors} selected={isSelected(p)} onPress={() => onRowTap(p)} t={t} />
                  ))}
                </>
              ) : (
                <EmptyRow label={t("searchTakeover.empty")} colors={colors} />
              )}
            </ScrollView>

            {/* Footer CTA — apply the whole multi-selection. Visible only with picks. */}
            {selCount > 0 && (
              <View style={{ padding: 12 }}>
                <Pressable onPress={showSelection} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
                  <LinearGradient colors={brand.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 16 }}>{t("searchTakeover.show", { n: selCount })}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
          </Animated.View>
      </View>
    </Modal>
  );
}

function SectionHeader({ label, colors }: { label: string; colors: { textSecondary: string } }) {
  return (
    <Text style={{ color: colors.textSecondary, fontFamily: font.bold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
      {label}
    </Text>
  );
}

function EmptyRow({ label, colors }: { label: string; colors: { textSecondary: string } }) {
  return (
    <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14, textAlign: "center", paddingHorizontal: 24, paddingVertical: 28 }}>
      {label}
    </Text>
  );
}

function WholeRow({ label, colors, onPress }: { label: string; colors: { border: string }; onPress: () => void }) {
  const press = usePressShrink(0.97);
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border }, press.style]}>
        <Ionicons name="apps-outline" size={20} color={brand.violet} />
        <Text style={{ flex: 1, color: brand.violet, fontFamily: font.semibold, fontSize: 15 }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function PlaceRow({
  place,
  lang,
  colors,
  selected,
  onPress,
  t,
}: {
  place: Place;
  lang: Lang;
  colors: { text: string; textSecondary: string; border: string };
  selected?: boolean;
  onPress: () => void;
  t: (k: string) => string;
}) {
  const press = usePressShrink(0.97);
  const secondary =
    place.kind === "metro" ? t("searchTakeover.metroLabel") : place.rayonId ? placeName(placeById(place.rayonId)!, lang) : undefined;
  const icon = place.kind === "metro" ? "train-outline" : "location-outline";
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: selected ? tints.violet.bg : "transparent" }, press.style]}>
        <Ionicons name={icon} size={20} color={selected ? brand.violet : colors.textSecondary} />
        <Text numberOfLines={1} style={{ flex: 1, color: selected ? brand.violet : colors.text, fontFamily: font.medium, fontSize: 15 }}>
          {placeName(place, lang)}
        </Text>
        {secondary ? (
          <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12 }}>
            {secondary}
          </Text>
        ) : null}
        {selected && <Ionicons name="checkmark" size={20} color={brand.violet} />}
      </Animated.View>
    </Pressable>
  );
}
