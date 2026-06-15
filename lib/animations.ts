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
  type SharedValue,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";

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

/**
 * Draggable bottom-sheet card between two snap positions (translateY offsets
 * from the top of the screen). `collapsedY` (larger = lower) is the resting
 * position; `expandedY` (smaller = higher) is fully open. Attach `pan` to a
 * GestureDetector on the sheet's drag handle and `sheetStyle` to the
 * Animated.View. Snaps on release by position + fling velocity.
 */
export function useDraggableSheet(collapsedY: number, expandedY: number, midY: number) {
  const translateY = useSharedValue(collapsedY);
  const start = useSharedValue(collapsedY);

  const pan = Gesture.Pan()
    .onStart(() => {
      start.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = start.value + e.translationY;
      // clamp between expanded (top) and collapsed (bottom)
      translateY.value = Math.min(collapsedY, Math.max(expandedY, next));
    })
    .onEnd((e) => {
      const v = e.velocityY;
      const pos = translateY.value;
      // Snap points ordered top(expanded) -> mid -> bottom(collapsed).
      const points = [expandedY, midY, collapsedY];
      let target: number;
      if (v < -500) {
        // Fast flick up: go to next point above current.
        target = pos > midY + 1 ? midY : expandedY;
      } else if (v > 500) {
        // Fast flick down: go to next point below current.
        target = pos < midY - 1 ? midY : collapsedY;
      } else {
        // Slow release: nearest of the three.
        target = points.reduce((best, p) =>
          Math.abs(p - pos) < Math.abs(best - pos) ? p : best, points[0]);
      }
      translateY.value = withSpring(target, {
        damping: 24,
        stiffness: 220,
        overshootClamping: true,
      });
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return { pan, sheetStyle, translateY };
}

// 5c-2 B1: pan over the scrollable content that hands off to the sheet.
// When content is scrolled to top and pulled DOWN, this pan collapses the
// sheet; otherwise it yields to the ScrollView. Used together with
// simultaneousWithExternalGesture(scrollRef) so pan and scroll coexist.
export function useSheetScrollGesture(
  translateY: SharedValue<number>,
  collapsedY: number,
  expandedY: number,
  midY: number,
  scrollY: SharedValue<number>,
  scrollRef: React.RefObject<any>,
) {
  const start = useSharedValue(collapsedY);
  const driving = useSharedValue(false);

  const pan = Gesture.Pan()
    .simultaneousWithExternalGesture(scrollRef)
    .onStart(() => {
      start.value = translateY.value;
      driving.value = false;
    })
    .onUpdate((e) => {
      const expanded = translateY.value <= expandedY + 1;
      // Drive the sheet only when: not fully expanded (so upward drag expands),
      // OR content is at the very top and the user pulls down (collapse).
      const atTop = scrollY.value <= 0;
      const pullingDown = e.translationY > 0;

      if (!driving.value) {
        if (!expanded) {
          driving.value = true; // sheet partially open: drag controls it
        } else if (atTop && pullingDown) {
          driving.value = true; // expanded + at top + pull down => collapse
        }
      }

      if (driving.value) {
        const next = start.value + e.translationY;
        translateY.value = Math.min(collapsedY, Math.max(expandedY, next));
      }
    })
    .onEnd((e) => {
      if (!driving.value) return;
      const v = e.velocityY;
      const pos = translateY.value;
      const points = [expandedY, midY, collapsedY];
      let target: number;
      if (v < -500) {
        target = pos > midY + 1 ? midY : expandedY;
      } else if (v > 500) {
        target = pos < midY - 1 ? midY : collapsedY;
      } else {
        target = points.reduce((best, p) =>
          Math.abs(p - pos) < Math.abs(best - pos) ? p : best, points[0]);
      }
      translateY.value = withSpring(target, {
        damping: 24,
        stiffness: 220,
        overshootClamping: true,
      });
      driving.value = false;
    });

  return { pan };
}
