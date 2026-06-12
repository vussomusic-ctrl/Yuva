import { Pressable, Text, View, StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** PRIMARY — solid brand gradient (violet→magenta), white bold text. */
export function PrimaryButton({ label, onPress, disabled, style }: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: pressed && !disabled ? 0.9 : 1 }, style]}
    >
      <LinearGradient
        colors={brand.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ paddingVertical: 16, borderRadius: 16, alignItems: "center", opacity: disabled ? 0.45 : 1 }}
      >
        <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 17 }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

/** SECONDARY — outlined: transparent fill + brand-violet border + violet text. */
export function SecondaryButton({ label, onPress, disabled, style }: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [{ opacity: pressed && !disabled ? 0.6 : 1 }, style]}
    >
      <View
        style={{
          paddingVertical: 16,
          borderRadius: 16,
          alignItems: "center",
          borderWidth: 1.5,
          borderColor: brand.violet,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 17 }}>{label}</Text>
      </View>
    </Pressable>
  );
}
