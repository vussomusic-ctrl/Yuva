import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./Button";
import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import {
  REGIONS,
  RAYONS,
  AREAS,
  METRO,
  Place,
  placeName,
  placeById,
  areasOfRayon,
} from "../lib/places";
import { foldSearch } from "../lib/normalize";

type Lang = "az" | "ru" | "en";

type Props = {
  visible: boolean;
  onClose: () => void;
  regions: string[]; // selected place ids: country region | Baku rayon | Baku area
  metro: string[]; // selected metro ids
  onApply: (regions: string[], metro: string[]) => void;
  lang: Lang;
};

// "Популярные" — hand-picked top regions (ids that actually exist in places.ts).
const POPULAR = ["baku", "sumqayit_city", "gence_city", "abseron_rayon", "naxcivan_city", "lenkeran_city"];

const matchPlace = (p: Place, folded: string): boolean =>
  !folded || foldSearch(`${p.az} ${p.ru} ${p.en}`).includes(folded);

// Is this selected set a "Baku context" (Baku itself / its rayons / its areas)?
const isBakuId = (id: string): boolean => {
  const p = placeById(id);
  return id === "baku" || p?.parentId === "baku";
};

export function LocationFilterSheet({ visible, onClose, regions, metro, onApply, lang }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();

  const [level, setLevel] = useState<"regions" | "baku">("baku");
  const [tab, setTab] = useState<"rayon" | "metro">("rayon");
  const [q, setQ] = useState("");
  const [draftR, setDraftR] = useState<string[]>(regions);
  const [draftM, setDraftM] = useState<string[]>(metro);
  const [regionsExpanded, setRegionsExpanded] = useState(false);
  const [expandedRayons, setExpandedRayons] = useState<Set<string>>(new Set());

  // Seed drafts on open; land on the level matching the current selection
  // (a country region → level 1, otherwise Baku detail).
  useEffect(() => {
    if (!visible) return;
    setDraftR(regions);
    setDraftM(metro);
    setQ("");
    const countryRegion = regions.find((id) => !isBakuId(id));
    setLevel(countryRegion ? "regions" : "baku");
    setTab("rayon");
    setRegionsExpanded(false);
    setExpandedRayons(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const folded = foldSearch(q.trim());
  const count = draftR.length + draftM.length;

  const toggle = (arr: string[], id: string): string[] =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  const toggleR = (id: string) => setDraftR((a) => toggle(a, id));
  const toggleM = (id: string) => setDraftM((a) => toggle(a, id));

  // Level 1 — single country-region context (radio). Tapping the selected one
  // again clears it (-> "Любая"). Baku drills into level 2, so it never lands here.
  const selectRegion = (id: string) => {
    setDraftR((cur) => (cur.includes(id) ? [] : [id]));
    setDraftM([]);
  };

  const reset = () => {
    setDraftR([]);
    setDraftM([]);
  };
  const apply = () => {
    onApply(draftR, draftM);
    onClose();
  };

  // --- Level 1 data ---
  const popularRegions = useMemo(
    () => POPULAR.map((id) => placeById(id)).filter((p): p is Place => !!p && matchPlace(p, folded)),
    [folded],
  );
  // Baku lives only in "Популярные" (and drills) — exclude it here to avoid a
  // dup. Sort by az name (stable across UI languages).
  const allRegions = useMemo(
    () =>
      [...REGIONS]
        .filter((p) => p.id !== "baku" && matchPlace(p, folded))
        .sort((a, b) => a.az.localeCompare(b.az)),
    [folded],
  );

  // --- Level 2 (Baku) search results across rayons / zones / metro ---
  const searchRayons = useMemo(() => RAYONS.filter((p) => matchPlace(p, folded)), [folded]);
  const searchZones = useMemo(
    () => AREAS.filter((p) => p.type !== "rayon" && matchPlace(p, folded)),
    [folded],
  );
  const searchMetro = useMemo(() => METRO.filter((p) => matchPlace(p, folded)), [folded]);

  const orphanZones = useMemo(() => AREAS.filter((p) => p.type !== "rayon" && !p.rayonId), []);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ height: height * 0.88 }}>
        {/* Header — X closes (cancel), back returns to the regions list */}
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
              <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 16 }}>
                {placeName(placeById("baku")!, lang)}
              </Text>
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
                <RegionRow key={`pop-${p.id}`} place={p} lang={lang} draftR={draftR} colors={colors}
                  onDrill={() => setLevel("baku")} onSelect={() => selectRegion(p.id)} />
              ))}
              {folded ? (
                // Search: flat list of all matching regions (no collapse)
                <>
                  {allRegions.length > 0 && <SectionHeader label={t("location.allRegions")} colors={colors} />}
                  {allRegions.map((p) => (
                    <RegionRow key={p.id} place={p} lang={lang} draftR={draftR} colors={colors}
                      onDrill={() => setLevel("baku")} onSelect={() => selectRegion(p.id)} />
                  ))}
                </>
              ) : (
                // Collapsed by default behind a toggle row
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
                      <RegionRow key={p.id} place={p} lang={lang} draftR={draftR} colors={colors}
                        onDrill={() => setLevel("baku")} onSelect={() => selectRegion(p.id)} />
                    ))}
                </>
              )}
            </>
          ) : folded ? (
            // Unified search across both tabs (Baku)
            <>
              {searchRayons.length > 0 && <SectionHeader label={t("filters.region")} colors={colors} />}
              {searchRayons.map((r) => (
                <CheckRow key={r.id} label={placeName(r, lang)} note={t("location.wholeRayon")}
                  checked={draftR.includes(r.id)} colors={colors} onPress={() => toggleR(r.id)} />
              ))}
              {searchZones.length > 0 && <SectionHeader label={t("location.zones")} colors={colors} />}
              {searchZones.map((z) => (
                <CheckRow key={z.id} label={placeName(z, lang)}
                  note={z.rayonId ? placeName(placeById(z.rayonId)!, lang) : undefined}
                  checked={draftR.includes(z.id) || (z.rayonId ? draftR.includes(z.rayonId) : false)}
                  colors={colors} onPress={() => toggleR(z.id)} />
              ))}
              {searchMetro.length > 0 && <SectionHeader label={t("filters.metro")} colors={colors} />}
              {searchMetro.map((m) => (
                <CheckRow key={m.id} label={placeName(m, lang)} note={t("filters.metro")}
                  checked={draftM.includes(m.id)} colors={colors} onPress={() => toggleM(m.id)} />
              ))}
            </>
          ) : tab === "rayon" ? (
            <>
              {RAYONS.map((r) => {
                const children = areasOfRayon(r.id);
                const wholeRayon = draftR.includes(r.id);
                const open = expandedRayons.has(r.id);
                return (
                  <View key={r.id}>
                    <RayonRow
                      rayon={r}
                      lang={lang}
                      count={children.length}
                      whole={wholeRayon}
                      open={open}
                      colors={colors}
                      onToggleExpand={() =>
                        setExpandedRayons((s) => {
                          const n = new Set(s);
                          n.has(r.id) ? n.delete(r.id) : n.add(r.id);
                          return n;
                        })
                      }
                      onCheck={() => toggleR(r.id)}
                    />
                    {open &&
                      children.map((c) => (
                        <CheckRow key={c.id} label={placeName(c, lang)} indent
                          checked={wholeRayon || draftR.includes(c.id)} colors={colors}
                          onPress={() => { if (!wholeRayon) toggleR(c.id); }} />
                      ))}
                  </View>
                );
              })}
              {orphanZones.length > 0 && <SectionHeader label={t("location.other")} colors={colors} />}
              {orphanZones.map((z) => (
                <CheckRow key={z.id} label={placeName(z, lang)} indent
                  checked={draftR.includes(z.id)} colors={colors} onPress={() => toggleR(z.id)} />
              ))}
            </>
          ) : (
            METRO.map((m) => (
              <CheckRow key={m.id} label={placeName(m, lang)}
                checked={draftM.includes(m.id)} colors={colors} onPress={() => toggleM(m.id)} />
            ))
          )}
        </ScrollView>

        {/* Footer: reset + apply(N) */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
          <Pressable onPress={reset} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 15 }}>{t("location.reset")}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <PrimaryButton label={`${t("location.done")}${count > 0 ? ` (${count})` : ""}`} onPress={apply} />
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

function Checkbox({ checked }: { checked: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: checked ? brand.violet : colors.border,
        backgroundColor: checked ? brand.violet : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
    </View>
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

// Collapsed rayon header: name + zone count + rotating chevron (expand) and a
// separate "весь район" checkbox (does not toggle the accordion). Whole-rayon
// selection tints the row so it's visible without expanding.
function RayonRow({
  rayon,
  lang,
  count,
  whole,
  open,
  colors,
  onToggleExpand,
  onCheck,
}: {
  rayon: Place;
  lang: Lang;
  count: number;
  whole: boolean;
  open: boolean;
  colors: { text: string; textSecondary: string; border: string };
  onToggleExpand: () => void;
  onCheck: () => void;
}) {
  const { mode } = useTheme();
  const hasZones = count > 0;
  const tint = mode === "dark" ? "rgba(139,63,214,0.14)" : "rgba(139,63,214,0.06)";
  return (
    <Pressable
      onPress={hasZones ? onToggleExpand : undefined}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: whole ? tint : "transparent",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text numberOfLines={1} style={{ color: whole ? brand.violet : colors.text, fontFamily: font.bold, fontSize: 15 }}>
        {placeName(rayon, lang)}
      </Text>
      {hasZones && (
        <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13 }}>{` · ${count}`}</Text>
      )}
      <View style={{ flex: 1 }} />
      {hasZones && <Chevron open={open} color={colors.textSecondary} />}
      <Pressable onPress={onCheck} hitSlop={12}>
        <Checkbox checked={whole} />
      </Pressable>
    </Pressable>
  );
}

function CheckRow({
  label,
  note,
  checked,
  colors,
  onPress,
  bold,
  indent,
}: {
  label: string;
  note?: string;
  checked: boolean;
  colors: { text: string; textSecondary: string; border: string };
  onPress: () => void;
  bold?: boolean;
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
      <Text
        numberOfLines={1}
        style={{ flex: 1, color: checked ? brand.violet : colors.text, fontFamily: bold ? font.bold : font.medium, fontSize: 15 }}
      >
        {label}
      </Text>
      {note ? (
        <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12 }}>{note}</Text>
      ) : null}
      <Checkbox checked={checked} />
    </Pressable>
  );
}

function RegionRow({
  place,
  lang,
  draftR,
  colors,
  onDrill,
  onSelect,
}: {
  place: Place;
  lang: Lang;
  draftR: string[];
  colors: { text: string; textSecondary: string; border: string };
  onDrill: () => void;
  onSelect: () => void;
}) {
  const isBaku = place.id === "baku";
  const selected = isBaku ? draftR.some(isBakuId) : draftR.includes(place.id);
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
  title: (color: string) =>
    ({ color, fontFamily: font.bold, fontSize: 17, textAlign: "center", paddingTop: 6, paddingBottom: 10 } as const),
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
