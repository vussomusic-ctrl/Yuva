// Shared animation presets for the app's living "clay/3D" feel. Keep micro-
// animations here as reusable hooks — do NOT scatter inline reanimated configs
// across screens. See CLAUDE.md → "Анимации".

import { useCallback, useEffect } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

/**
 * Mount entrance: fade in + gentle scale-up, runs once when the component
 * mounts. Apply `style` to an Animated.View (e.g. the welcome logo).
 */
export function useMountFadeScale(fromScale = 0.92, duration = 450) {
  const progress = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: fromScale + (1 - fromScale) * progress.value }],
  }));
  useEffect(() => {
    progress.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [progress, duration]);
  return style;
}

/**
 * Press-and-hold shrink with NO bounce: ease smoothly down to `scaleTo` on
 * press-in, ease back to 1 on press-out (timing, not spring). Same handler/style
 * shape as usePressScale. Put on inner Pressables (a child ScrollView cancels
 * the press when a drag starts, so the card never sticks shrunk).
 */
export function usePressShrink(scaleTo = 0.97) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = useCallback(() => {
    scale.value = withTiming(scaleTo, { duration: 110, easing: Easing.out(Easing.quad) });
  }, [scaleTo, scale]);
  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
  }, [scale]);
  return { style, onPressIn, onPressOut };
}

/**
 * One-shot tap pulse: spring down to `dipScale` then back to 1. Fire `pulse()`
 * from onPress and apply `style` to an Animated.View. Unlike usePressScale it
 * attaches NO press-in/out handlers, so it never competes with a child gesture
 * (e.g. a horizontal photo swiper inside the card).
 */
export function useTapPulse(dipScale = 0.96) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pulse = useCallback(() => {
    scale.value = withSequence(
      withSpring(dipScale, { damping: 18, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );
  }, [dipScale, scale]);
  return { style, pulse };
}

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
