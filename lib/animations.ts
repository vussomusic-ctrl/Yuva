// Shared animation presets for the app's living "clay/3D" feel. Keep micro-
// animations here as reusable hooks — do NOT scatter inline reanimated configs
// across screens. See CLAUDE.md → "Анимации".

import { useCallback } from "react";
import { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

/**
 * Press feedback: spring-scale down while pressed, spring back on release.
 * Spread `onPressIn`/`onPressOut` onto a Pressable and apply `style` to an
 * Animated.View wrapping the content.
 */
export function usePressScale(pressedScale = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = useCallback(() => {
    scale.value = withSpring(pressedScale, { damping: 15 });
  }, [pressedScale, scale]);
  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 });
  }, [scale]);
  return { style, onPressIn, onPressOut };
}
