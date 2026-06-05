import { ScrollView, Pressable, Text } from "react-native";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { DEALS, DealKey } from "../lib/dealTypes";

export type { DealKey } from "../lib/dealTypes";

type Props = {
  value: DealKey;
  onChange: (k: DealKey) => void;
};

/** Horizontal deal-type chips (Satılır / Kirayə). Shared by Home & Search. */
export function DealTypeChips({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // flexGrow:0 keeps the row at its natural height when used directly inside a
      // flex column (Search), so the active chip isn't stretched vertically.
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}
    >
      {DEALS.map((d) => {
        const active = value === d.key;
        return (
          <Pressable
            key={d.key}
            onPress={() => onChange(d.key)}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 9,
              borderRadius: 999,
              backgroundColor: active ? brand.violet : colors.card,
              borderWidth: 1,
              borderColor: active ? brand.violet : colors.border,
            }}
          >
            <Text style={{ color: active ? "#FFFFFF" : colors.text, fontSize: 13, fontWeight: "700" }}>
              {t(d.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
