import { ScrollView, View, Text, Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { useFilters } from "../lib/filters-state";
import { PROPERTY_TYPES } from "../lib/propertyTypes";
import { usePressShrink } from "../lib/animations";

type Props = {
  onPressDeal?: () => void;
  onPressType?: () => void;
  onPressPrice?: () => void;
  onPressArea?: () => void;
  onPressRooms?: () => void;
  onPressBuild?: () => void;
};

// "10000–50000 ₼" / "от 10000 ₼" / "до 50000 ₼" / fallback label.
function rangeLabel(min: string, max: string, unit: string, fromWord: string, toWord: string, fallback: string): string {
  if (min && max) return `${min}–${max} ${unit}`;
  if (min) return `${fromWord} ${min} ${unit}`;
  if (max) return `${toWord} ${max} ${unit}`;
  return fallback;
}

const ROOM_ORDER = (r: string) => (r === "5+" ? 5 : Number(r)); // numeric sort, "5+" last

/** Horizontal quick-filter chips under the deal segment. Reads/writes useFilters. */
export function FilterChipsRow({ onPressDeal, onPressType, onPressPrice, onPressArea, onPressRooms, onPressBuild }: Props) {
  const { t } = useTranslation();
  const { filters } = useFilters();

  // Deal chip: a deal type is ALWAYS chosen → always "active", shows the value.
  const dealLabel = t(filters.dealType === "rent" ? "home.dealRent" : "home.dealSale");

  // Price / area range chips.
  const priceActive = !!(filters.priceMin || filters.priceMax);
  const priceLabel = rangeLabel(filters.priceMin, filters.priceMax, "₼", t("filters.min"), t("filters.max"), t("filters.price"));
  const areaActive = !!(filters.areaMin || filters.areaMax);
  const areaLabel = rangeLabel(filters.areaMin, filters.areaMax, "m²", t("filters.min"), t("filters.max"), t("filters.area"));

  // Type chip summary: 0 → label; 1 → name; >1 → "first, +n-1".
  const typeActive = filters.propertyTypes.length > 0;
  const typeLabel = (() => {
    if (!typeActive) return t("filters.propertyType");
    const names = filters.propertyTypes.map((k) => t(PROPERTY_TYPES.find((p) => p.key === k)!.labelKey));
    return names.length === 1 ? names[0] : `${names[0]}, +${names.length - 1}`;
  })();

  // Rooms chip summary: 0 → label; else "2, 3 комн.".
  const roomsActive = filters.rooms.length > 0;
  const roomsLabel = roomsActive
    ? `${[...filters.rooms].sort((a, b) => ROOM_ORDER(a) - ROOM_ORDER(b)).join(", ")} ${t("search.roomsShort")}`
    : t("filters.rooms");

  // Build chip summary: null → label; else value name.
  const buildActive = filters.buildType != null;
  const buildLabel = buildActive
    ? t(filters.buildType === "new" ? "filters.buildNew" : "filters.buildSecondary")
    : t("filters.buildType");

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }} // size to content height — a horizontal ScrollView otherwise expands vertically in a column parent
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 12 }}
    >
      <Chip label={dealLabel} active onPress={onPressDeal} />
      <Chip label={typeLabel} active={typeActive} onPress={onPressType} />
      <Chip label={priceLabel} active={priceActive} onPress={onPressPrice} />
      <Chip label={areaLabel} active={areaActive} onPress={onPressArea} />
      <Chip label={roomsLabel} active={roomsActive} onPress={onPressRooms} />
      <Chip label={buildLabel} active={buildActive} onPress={onPressBuild} />
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  const press = usePressShrink(0.96);
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingVertical: 9,
            paddingHorizontal: 14,
            borderRadius: 11,
            borderWidth: 1,
            backgroundColor: active ? brand.violet : colors.card,
            borderColor: active ? brand.violet : "rgba(0,0,0,0.10)",
          },
          press.style,
        ]}
      >
        <Text style={{ color: active ? "#FFFFFF" : colors.text, fontFamily: font.medium, fontSize: 14 }}>{label}</Text>
        <Ionicons name="chevron-down" size={13} color={active ? "rgba(255,255,255,0.85)" : "#999999"} />
      </Animated.View>
    </Pressable>
  );
}
