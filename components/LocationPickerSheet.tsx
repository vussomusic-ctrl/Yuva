import { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./Button";
import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { REGIONS, RAYONS, AREAS, METRO, Place, placeName, placeById, areasOfRayon } from "../lib/places";
import { foldSearch } from "../lib/normalize";
import { POPULAR, matchPlace, isBakuId } from "../lib/placeSearch";

type Lang = "az" | "ru" | "en";

type Props = {
  visible: boolean;
  onClose: () => void;
  placeId: string | null;
  metroId: string | null;
  onSelectPlace: (id: string | null) => void;
  onSelectMetro: (id: string | null) => void;
  lang: Lang;
};

/**
 * SINGLE-select location picker for Add Listing — same rich hierarchy as the
 * search LocationFilterSheet (Bakı → rayon → zones tree, Район/Метро tabs, search,
 * "Популярные"), but one place at a time. Live select via onSelectPlace/onSelectMetro
 * (no draft/apply). A non-Baku country pick selects + closes; rayon/zone/metro picks
 * highlight and stay open (confirm with «Готово»). Metro is Baku-only, independent
 * of placeId. Drop-in replacement for RegionPickerSheet (same props).
 */
export function LocationPickerSheet({ visible, onClose, placeId, metroId, onSelectPlace, onSelectMetro, lang }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();

  const [level, setLevel] = useState<"regions" | "baku">("regions");
  const [tab, setTab] = useState<"rayon" | "metro">("rayon");
  const [q, setQ] = useState("");
  const [regionsExpanded, setRegionsExpanded] = useState(false);
  const [expandedRayons, setExpandedRayons] = useState<Set<string>>(new Set());

  // On open: drill straight into Baku if the current place lives there, else land
  // on the country list. Reset search + accordions.
  useEffect(() => {
    if (!visible) return;
    setQ("");
    setLevel(placeId && isBakuId(placeId) ? "baku" : "regions");
    setTab("rayon");
    setRegionsExpanded(false);
    setExpandedRayons(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const folded = foldSearch(q.trim());
  const count = (placeId ? 1 : 0) + (metroId ? 1 : 0);

  // Country leaf (non-Baku) → select + clear metro + close, like the old sheet.
  const selectCountry = (id: string) => {
    onSelectMetro(null);
    onSelectPlace(id);
    onClose();
  };
  // Rayon / zone → select (or re-tap to clear); stays open.
  const selectPlace = (id: string) => onSelectPlace(placeId === id ? null : id);
  // Metro → select (or re-tap to clear); independent of placeId, stays open.
  const selectMetro = (id: string) => onSelectMetro(metroId === id ? null : id);
  // Expand/collapse a rayon's zones (chevron, and the row tap alongside select).
  const toggleExpand = (id: string) =>
    setExpandedRayons((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const reset = () => {
    onSelectPlace(null);
    onSelectMetro(null);
  };

  const popularRegions = POPULAR.map((id) => placeById(id)).filter((p): p is Place => !!p && matchPlace(p, folded));
  const allRegions = [...REGIONS].filter((p) => p.id !== "baku" && matchPlace(p, folded)).sort((a, b) => a.az.localeCompare(b.az));

  const searchRayons = RAYONS.filter((p) => matchPlace(p, folded));
  const searchZones = AREAS.filter((p) => p.type !== "rayon" && matchPlace(p, folded));
  const searchMetro = METRO.filter((p) => matchPlace(p, folded));
  const orphanZones = AREAS.filter((p) => p.type !== "rayon" && !p.rayonId);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ height: height * 0.88 }}>
        {/* Header — X closes (cancel); back returns to the country list */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 }}>
          <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          {level === "regions" ? (
            <Text style={{ flex: 1, textAlign: "center", marginRight: 34, color: colors.text, fontFamily: font.bold, fontSize: 17 }}>
              {t("location.title")}
            </Text>
          ) : (
            <Pressable
              onPress={() => setLevel("regions")}
              hitSlop={8}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="chevron-back" size={20} color={brand.violet} />
              <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 16 }}>{placeName(placeById("baku")!, lang)}</Text>
            </Pressable>
          )}
        </View>

        {/* Search */}
        <View style={styles.search(colors.border, colors.bg)}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("location.searchPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
            style={{ flex: 1, color: colors.text, fontFamily: font.regular, fontSize: 15 }}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Tabs — only in Baku detail, and only when not searching */}
        {level === "baku" && !folded && (
          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
            <TabPill label={t("filters.region")} active={tab === "rayon"} onPress={() => setTab("rayon")} />
            <TabPill label={t("filters.metro")} active={tab === "metro"} onPress={() => setTab("metro")} />
          </View>
        )}

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {level === "regions" ? (
            <>
              {popularRegions.length > 0 && <SectionHeader label={t("location.popular")} colors={colors} />}
              {popularRegions.map((p) => (
                <RegionRow key={`pop-${p.id}`} place={p} lang={lang} placeId={placeId} colors={colors}
                  onDrill={() => setLevel("baku")} onSelect={() => selectCountry(p.id)} />
              ))}
              {folded ? (
                <>
                  {allRegions.length > 0 && <SectionHeader label={t("location.allRegions")} colors={colors} />}
                  {allRegions.map((p) => (
                    <RegionRow key={p.id} place={p} lang={lang} placeId={placeId} colors={colors}
                      onDrill={() => setLevel("baku")} onSelect={() => selectCountry(p.id)} />
                  ))}
                </>
              ) : (
                <>
                  <Pressable
                    onPress={() => setRegionsExpanded((x) => !x)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 15,
                      paddingHorizontal: 20,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text style={{ flex: 1, color: colors.text, fontFamily: font.bold, fontSize: 15 }}>
                      {`${t("location.allRegions")} (${allRegions.length})`}
                    </Text>
                    <Chevron open={regionsExpanded} color={colors.textSecondary} />
                  </Pressable>
                  {regionsExpanded &&
                    allRegions.map((p) => (
                      <RegionRow key={p.id} place={p} lang={lang} placeId={placeId} colors={colors}
                        onDrill={() => setLevel("baku")} onSelect={() => selectCountry(p.id)} />
                    ))}
                </>
              )}
            </>
          ) : folded ? (
            // Unified search across both tabs (Baku)
            <>
              {searchRayons.length > 0 && <SectionHeader label={t("filters.region")} colors={colors} />}
              {searchRayons.map((r) => (
                <SelectRow key={r.id} label={placeName(r, lang)} note={t("location.wholeRayon")}
                  selected={placeId === r.id} colors={colors} onPress={() => selectPlace(r.id)} />
              ))}
              {searchZones.length > 0 && <SectionHeader label={t("location.zones")} colors={colors} />}
              {searchZones.map((z) => (
                <SelectRow key={z.id} label={placeName(z, lang)}
                  note={z.rayonId ? placeName(placeById(z.rayonId)!, lang) : undefined}
                  selected={placeId === z.id} colors={colors} onPress={() => selectPlace(z.id)} />
              ))}
              {searchMetro.length > 0 && <SectionHeader label={t("filters.metro")} colors={colors} />}
              {searchMetro.map((m) => (
                <SelectRow key={m.id} label={placeName(m, lang)} note={t("filters.metro")}
                  selected={metroId === m.id} colors={colors} onPress={() => selectMetro(m.id)} />
              ))}
            </>
          ) : tab === "rayon" ? (
            <>
              {RAYONS.map((r) => {
                const children = areasOfRayon(r.id);
                const open = expandedRayons.has(r.id);
                return (
                  <View key={r.id}>
                    <RayonRow
                      rayon={r}
                      lang={lang}
                      count={children.length}
                      selected={placeId === r.id}
                      open={open}
                      colors={colors}
                      onToggleExpand={() => toggleExpand(r.id)}
                      onSelect={() => {
                        // Row tap = select the rayon AND toggle its zones open, so a
                        // single tap both picks it and reveals the zones (chevron alone
                        // just expands without selecting).
                        selectPlace(r.id);
                        toggleExpand(r.id);
                      }}
                    />
                    {open &&
                      children.map((c) => (
                        <SelectRow key={c.id} label={placeName(c, lang)} indent
                          selected={placeId === c.id} colors={colors} onPress={() => selectPlace(c.id)} />
                      ))}
                  </View>
                );
              })}
              {orphanZones.length > 0 && <SectionHeader label={t("location.other")} colors={colors} />}
              {orphanZones.map((z) => (
                <SelectRow key={z.id} label={placeName(z, lang)} indent
                  selected={placeId === z.id} colors={colors} onPress={() => selectPlace(z.id)} />
              ))}
            </>
          ) : (
            METRO.map((m) => (
              <SelectRow key={m.id} label={placeName(m, lang)}
                selected={metroId === m.id} colors={colors} onPress={() => selectMetro(m.id)} />
            ))
          )}
        </ScrollView>

        {/* Footer: reset + done(N) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
          <Pressable onPress={reset} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 15 }}>{t("location.reset")}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <PrimaryButton label={`${t("location.done")}${count > 0 ? ` (${count})` : ""}`} onPress={onClose} />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: active ? brand.violet : colors.bg,
        borderWidth: 1,
        borderColor: active ? brand.violet : colors.border,
      }}
    >
      <Text style={{ color: active ? "#FFFFFF" : colors.text, fontFamily: font.bold, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

function Chevron({ open, color }: { open: boolean; color: string }) {
  const r = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    r.value = withTiming(open ? 1 : 0, { duration: 180 });
  }, [open, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value * 180}deg` }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name="chevron-down" size={18} color={color} />
    </Animated.View>
  );
}

// Collapsed rayon header (single-select): tap the name selects the whole rayon
// (violet tint + check); the chevron expands its zones without selecting.
function RayonRow({
  rayon,
  lang,
  count,
  selected,
  open,
  colors,
  onToggleExpand,
  onSelect,
}: {
  rayon: Place;
  lang: Lang;
  count: number;
  selected: boolean;
  open: boolean;
  colors: { text: string; textSecondary: string; border: string };
  onToggleExpand: () => void;
  onSelect: () => void;
}) {
  const { mode } = useTheme();
  const hasZones = count > 0;
  const tint = mode === "dark" ? "rgba(139,63,214,0.14)" : "rgba(139,63,214,0.06)";
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: selected ? tint : "transparent",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text numberOfLines={1} style={{ color: selected ? brand.violet : colors.text, fontFamily: font.bold, fontSize: 15 }}>
        {placeName(rayon, lang)}
      </Text>
      <View style={{ flex: 1 }} />
      {hasZones && (
        <Pressable onPress={onToggleExpand} hitSlop={12} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
          <Chevron open={open} color={colors.textSecondary} />
        </Pressable>
      )}
      {selected && <Ionicons name="checkmark-circle" size={22} color={brand.violet} />}
    </Pressable>
  );
}

function SelectRow({
  label,
  note,
  selected,
  colors,
  onPress,
  indent,
}: {
  label: string;
  note?: string;
  selected: boolean;
  colors: { text: string; textSecondary: string; border: string };
  onPress: () => void;
  indent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 13,
        paddingRight: 20,
        paddingLeft: indent ? 36 : 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text numberOfLines={1} style={{ flex: 1, color: selected ? brand.violet : colors.text, fontFamily: font.medium, fontSize: 15 }}>
        {label}
      </Text>
      {note ? <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12 }}>{note}</Text> : null}
      {selected && <Ionicons name="checkmark-circle" size={22} color={brand.violet} />}
    </Pressable>
  );
}

function RegionRow({
  place,
  lang,
  placeId,
  colors,
  onDrill,
  onSelect,
}: {
  place: Place;
  lang: Lang;
  placeId: string | null;
  colors: { text: string; textSecondary: string; border: string };
  onDrill: () => void;
  onSelect: () => void;
}) {
  const isBaku = place.id === "baku";
  const selected = isBaku ? isBakuId(placeId ?? "") : placeId === place.id;
  return (
    <Pressable
      onPress={isBaku ? onDrill : onSelect}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {isBaku && <Ionicons name="star" size={16} color={brand.orange} />}
      <Text
        numberOfLines={1}
        style={{ flex: 1, color: selected ? brand.violet : colors.text, fontFamily: selected ? font.bold : font.medium, fontSize: 16 }}
      >
        {placeName(place, lang)}
      </Text>
      {isBaku ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      ) : selected ? (
        <Ionicons name="checkmark-circle" size={22} color={brand.violet} />
      ) : null}
    </Pressable>
  );
}

function SectionHeader({ label, colors }: { label: string; colors: { textSecondary: string } }) {
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontFamily: font.bold,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 6,
      }}
    >
      {label}
    </Text>
  );
}

const styles = {
  search: (border: string, bg: string) =>
    ({
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      marginBottom: 8,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: bg,
      paddingHorizontal: 12,
    } as const),
};
