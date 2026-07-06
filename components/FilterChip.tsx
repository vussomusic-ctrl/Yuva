import { View, Text, Pressable } from "react-native";
import Animated from "react-native-reanimated";

import { brand, Theme } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { usePressShrink } from "../lib/animations";

// Chip border on light bg (shared across filters screen + sheets).
const SOFT_BORDER = "rgba(0,0,0,0.10)";

export function FilterChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: Theme;
}) {
  const press = usePressShrink(0.96);
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[
          {
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 11,
            backgroundColor: active ? brand.violet : colors.card,
            borderWidth: 1,
            borderColor: active ? brand.violet : SOFT_BORDER,
          },
          press.style,
        ]}
      >
        <Text style={{ color: active ? "#FFFFFF" : colors.text, fontFamily: font.medium, fontSize: 14 }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function ChipWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}
