// Shared animation presets for the app's living "clay/3D" feel. Keep micro-
// animations here as reusable hooks — do NOT scatter inline reanimated configs
// across screens. See CLAUDE.md → "Анимации".

import { useCallback } from "react";
import { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

/**
 * Sliding indicator for a segmented control. Tracks a 0..N-1 index and exposes
 * an animated style that translates by `index * segmentWidth`. `slideTo` springs
 * to a new index; pass the measured segment width (e.g. from onLayout).
 */
export function useSpringSlide(initialIndex = 0) {
  const index = useSharedValue(initialIndex);
  const segWidth = useSharedValue(0);

  const slideTo = useCallback(
    (next: number) => {
      index.value = withSpring(next, { damping: 18, stiffness: 180 });
    },
    [index],
  );

  const setSegmentWidth = useCallback(
    (w: number) => {
      segWidth.value = w;
    },
    [segWidth],
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: index.value * segWidth.value }],
  }));

  return { style, slideTo, setSegmentWidth };
}

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
