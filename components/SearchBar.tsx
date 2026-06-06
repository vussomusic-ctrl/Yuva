import { View, TextInput, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";

type Props = {
  value: string;
  onChangeText: (s: string) => void;
  onPressFilter?: () => void;
  placeholder?: string;
  // Number of active filters; shows a count badge on the filter icon when > 0.
  filterBadge?: number;
};

/** Rounded search field with a trailing filter button. Shared by Home & Search. */
export function SearchBar({ value, onChangeText, onPressFilter, placeholder, filterBadge = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

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
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? t("home.searchPlaceholder")}
        placeholderTextColor={colors.textSecondary}
        style={{ flex: 1, marginHorizontal: 8, color: colors.text, fontSize: 14 }}
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
