import { View, TextInput, Pressable, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, tints } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";

type LocationChip = { id: string; label: string; kind: "region" | "metro" };

type Props = {
  value: string;
  onChangeText: (s: string) => void;
  onPressFilter?: () => void;
  placeholder?: string;
  // Number of active filters; shows a count badge on the filter icon when > 0.
  filterBadge?: number;
  // Applied-location chips (capsule + type icon + clear X). Shown before the input.
  chips?: LocationChip[];
  onRemoveChip?: (chip: LocationChip) => void; // remove a single id
  onClearLocation?: () => void; // full clear (fires on the last chip's X)
};

function LocationCapsule({ chip, onPress }: { chip: LocationChip; onPress?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 32, borderRadius: 16, paddingHorizontal: 10, backgroundColor: tints.violet.bg }}>
      <Ionicons name={chip.kind === "metro" ? "train-outline" : "location-outline"} size={14} color={brand.violet} />
      <Text numberOfLines={1} style={{ color: brand.violet, fontFamily: font.medium, fontSize: 13, maxWidth: 120 }}>{chip.label}</Text>
      <Pressable onPress={onPress} hitSlop={8}>
        <Ionicons name="close" size={14} color={brand.violet} />
      </Pressable>
    </View>
  );
}

/** Rounded search field with a trailing filter button. Shared by Home & Search. */
export function SearchBar({ value, onChangeText, onPressFilter, placeholder, filterBadge = 0, chips = [], onRemoveChip, onClearLocation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const hasChips = chips.length > 0;
  const shown = chips.slice(0, 2);
  const extra = chips.length - shown.length;
  const removeChip = (chip: LocationChip) => (chips.length === 1 ? onClearLocation?.() : onRemoveChip?.(chip));

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 16,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons name="search" size={20} color={colors.textSecondary} />
      {hasChips && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexShrink: 1, marginLeft: 8 }}
          contentContainerStyle={{ alignItems: "center", gap: 6 }}
          keyboardShouldPersistTaps="handled"
        >
          {shown.map((c) => (
            <LocationCapsule key={c.id} chip={c} onPress={() => removeChip(c)} />
          ))}
          {extra > 0 && (
            <View style={{ height: 32, borderRadius: 16, paddingHorizontal: 10, justifyContent: "center", backgroundColor: tints.violet.bg }}>
              <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 13 }}>{`+${extra}`}</Text>
            </View>
          )}
        </ScrollView>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={hasChips ? "" : (placeholder ?? t("home.searchPlaceholder"))}
        placeholderTextColor={colors.textSecondary}
        style={{ flex: 1, marginHorizontal: 8, color: colors.text, fontFamily: font.regular, fontSize: 14, letterSpacing: 0 }}
      />
      <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginRight: 10 }} />
      <Pressable hitSlop={8} onPress={onPressFilter}>
        <View>
          <Ionicons name="options-outline" size={22} color={brand.violet} />
          {filterBadge > 0 && (
            <View
              style={{
                position: "absolute",
                top: -8,
                right: -10,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                paddingHorizontal: 4,
                backgroundColor: brand.magenta,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "800" }}>{filterBadge}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}
