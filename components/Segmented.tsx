import { View, Pressable, Text } from "react-native";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";

type Option = { key: string; label: string };

type Props = {
  options: Option[];
  value: string;
  onChange: (key: string) => void;
};

/** Themed segmented control. Selected segment uses brand violet (token-driven). */
export function Segmented({ options, value, onChange }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 9,
              alignItems: "center",
              backgroundColor: active ? brand.violet : "transparent",
            }}
          >
            <Text
              style={{
                color: active ? "#FFFFFF" : colors.textSecondary,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
