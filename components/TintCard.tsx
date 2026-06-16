import { Pressable, View, StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import { tints, TintKey } from "../lib/theme/colors";
import { usePressScale } from "../lib/animations";

type Props = {
  tint?: TintKey;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  children: React.ReactNode;
};

/**
 * Raised "clay/3D" surface: pastel tint background + matching colored shadow.
 * Tap-aware — when `onPress` is given, wraps in a Pressable with usePressScale.
 * iOS gets the colored shadow; Android falls back to a neutral elevation.
 */
export function TintCard({ tint = "violet", style, onPress, children }: Props) {
  const press = usePressScale(0.96);
  const t = tints[tint];

  const cardStyle: ViewStyle = {
    backgroundColor: t.bg,
    borderRadius: 20,
    padding: 16,
    shadowColor: t.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  };

  if (!onPress) {
    return <View style={[cardStyle, style]}>{children}</View>;
  }

  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View style={[cardStyle, press.style, style]}>{children}</Animated.View>
    </Pressable>
  );
}
