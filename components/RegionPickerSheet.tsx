import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./Button";
import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import {
  REGIONS,
  METRO,
  areasOf,
  placeById,
  placeName,
  regionOfPlace,
  Place,
} from "../lib/places";
import { foldSearch } from "../lib/normalize";

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

const matchesQuery = (p: Place, folded: string): boolean =>
  !folded || foldSearch(`${p.az} ${p.ru} ${p.en}`).includes(folded);

/**
 * Cascading location picker for Add Listing.
 *  - Root: all 78 regions (Baku pinned on top), search folds az diacritics so a
 *    Latin query like "narimanov" matches "Nərimanov". Same-named city/rayon get
 *    a type suffix (Şəki şəh. / Şəki r.).
 *  - Tap Baku -> drill into Baku detail: "All Baku" + areas + a separate Metro
 *    block. Area & metro are independent (live select), confirmed with «Done».
 *  - Any other region is a leaf -> selects placeId and closes (clears metro).
 */
export function RegionPickerSheet({
  visible,
  onClose,
  placeId,
  metroId,
  onSelectPlace,
  onSelectMetro,
  lang,
}: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [level, setLevel] = useState<"root" | "baku">("root");
  const [q, setQ] = useState("");

  // On open: drill straight into Baku if the current location lives there, so the
  // user lands where their selection is. Reset query on open/close.
  useEffect(() => {
    if (visible) {
      setLevel(regionOfPlace(placeId) === "baku" ? "baku" : "root");
    }
    setQ("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const folded = foldSearch(q.trim());

  // Type suffix only for names that collide within the region list (current lang).
  const collisionNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of REGIONS) {
      const n = placeName(r, lang);
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, c]) => c > 1).map(([n]) => n));
  }, [lang]);

  const regionLabel = (p: Place): string => {
    const base = placeName(p, lang);
    if (!collisionNames.has(base)) return base;
    const suffix =
      p.type === "seher" ? t("addListing.typeSeher") : p.type === "rayon" ? t("addListing.typeRayon") : "";
    return suffix ? `${base} ${suffix}` : base;
  };

  // Root list: Baku first, then the rest alphabetically by localized name.
  const rootRegions = useMemo(() => {
    const others = REGIONS.filter((r) => r.id !== "baku").sort((a, b) =>
      placeName(a, lang).localeCompare(placeName(b, lang)),
    );
    const baku = REGIONS.find((r) => r.id === "baku");
    return [...(baku ? [baku] : []), ...others].filter((p) => matchesQuery(p, folded));
  }, [lang, folded]);

  // Baku detail: rayons first, then qəsəbə / microrayon; metro is its own block.
  const bakuAreas = useMemo(() => {
    const areas = areasOf("baku");
    const rayons = areas.filter((a) => a.type === "rayon").sort((a, b) => placeName(a, lang).localeCompare(placeName(b, lang)));
    const rest = areas.filter((a) => a.type !== "rayon").sort((a, b) => placeName(a, lang).localeCompare(placeName(b, lang)));
    return [...rayons, ...rest].filter((p) => matchesQuery(p, folded));
  }, [lang, folded]);

  const bakuMetro = useMemo(
    () =>
      [...METRO]
        .sort((a, b) => placeName(a, lang).localeCompare(placeName(b, lang)))
        .filter((p) => matchesQuery(p, folded)),
    [lang, folded],
  );

  const selectLeaf = (id: string) => {
    onSelectPlace(id);
    onSelectMetro(null); // metro is Baku-only — clear when leaving Baku
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {/* Header / breadcrumb */}
      {level === "root" ? (
        <Text style={styles.title(colors.text)}>{t("addListing.locationLabel")}</Text>
      ) : (
        <Pressable
          onPress={() => setLevel("root")}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingTop: 8,
            paddingBottom: 10,
            paddingHorizontal: 16,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="chevron-back" size={20} color={brand.violet} />
          <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 16 }}>
            {placeName(placeById("baku")!, lang)}
          </Text>
        </Pressable>
      )}

      {/* Search */}
      <View style={styles.search(colors.border, colors.bg)}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={level === "root" ? t("addListing.searchRegion") : t("addListing.searchBaku")}
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

      <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
        {level === "root"
          ? rootRegions.map((p) => {
              const isBaku = p.id === "baku";
              const active = isBaku ? regionOfPlace(placeId) === "baku" : placeId === p.id;
              return (
                <Row
                  key={p.id}
                  label={regionLabel(p)}
                  active={active}
                  colors={colors}
                  leftIcon={isBaku ? "star" : undefined}
                  rightIcon={isBaku ? "chevron-forward" : active ? "checkmark-circle" : undefined}
                  onPress={() => (isBaku ? setLevel("baku") : selectLeaf(p.id))}
                />
              );
            })
          : (
            <>
              {/* All Baku (no specific area) */}
              {matchesQuery(placeById("baku")!, folded) && (
                <Row
                  label={t("addListing.allBaku")}
                  active={placeId === "baku"}
                  colors={colors}
                  rightIcon={placeId === "baku" ? "checkmark-circle" : undefined}
                  onPress={() => onSelectPlace("baku")}
                />
              )}

              {bakuAreas.length > 0 && <SectionHeader label={t("addListing.areasHeader")} colors={colors} />}
              {bakuAreas.map((p) => (
                <Row
                  key={p.id}
                  label={placeName(p, lang)}
                  active={placeId === p.id}
                  colors={colors}
                  rightIcon={placeId === p.id ? "checkmark-circle" : undefined}
                  onPress={() => onSelectPlace(p.id)}
                />
              ))}

              <SectionHeader label={t("filters.metro")} colors={colors} />
              <Row
                label={t("addListing.notSelected")}
                active={metroId == null}
                muted
                colors={colors}
                rightIcon={metroId == null ? "checkmark-circle" : undefined}
                onPress={() => onSelectMetro(null)}
              />
              {bakuMetro.map((p) => (
                <Row
                  key={p.id}
                  label={placeName(p, lang)}
                  active={metroId === p.id}
                  colors={colors}
                  rightIcon={metroId === p.id ? "checkmark-circle" : undefined}
                  onPress={() => onSelectMetro(p.id)}
                />
              ))}
            </>
          )}
      </ScrollView>

      {/* Baku detail confirms with Done (area + metro chosen in one pass) */}
      {level === "baku" && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <PrimaryButton label={t("addListing.doneSelect")} onPress={onClose} />
        </View>
      )}
    </BottomSheet>
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

function Row({
  label,
  active,
  muted,
  colors,
  leftIcon,
  rightIcon,
  onPress,
}: {
  label: string;
  active: boolean;
  muted?: boolean;
  colors: { text: string; textSecondary: string; border: string };
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
        {leftIcon && <Ionicons name={leftIcon} size={18} color={brand.orange} />}
        <Text
          style={{
            color: active ? brand.violet : muted ? colors.textSecondary : colors.text,
            fontFamily: active ? font.bold : font.medium,
            fontSize: 16,
          }}
        >
          {label}
        </Text>
      </View>
      {rightIcon && (
        <Ionicons
          name={rightIcon}
          size={rightIcon === "checkmark-circle" ? 22 : 18}
          color={rightIcon === "chevron-forward" ? colors.textSecondary : brand.violet}
        />
      )}
    </Pressable>
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
