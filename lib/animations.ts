// Shared animation presets for the app's living "clay/3D" feel. Keep micro-
// animations here as reusable hooks — do NOT scatter inline reanimated configs
// across screens. See CLAUDE.md → "Анимации".

import { useCallback, useEffect } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  Extrapolation,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
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
 * Endless soft "breathing": scale gently loops 1 ↔ `to` and back (yoyo). Apply
 * `style` to an Animated.View (e.g. the home hero mascot).
 */
export function useBreathe(to = 1.04, duration = 2200) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  useEffect(() => {
    scale.value = withRepeat(withTiming(to, { duration, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [scale, to, duration]);
  return style;
}

/**
 * Staggered mount entrance for list items: fade in + slide up, each item delayed
 * by `index * delayStep`. Apply `style` to an Animated.View wrapping the item.
 */
export function useStaggerIn(index: number, opts?: { delayStep?: number; duration?: number; distance?: number }) {
  const { delayStep = 70, duration = 320, distance = 12 } = opts ?? {};
  const p = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: (1 - p.value) * distance }],
  }));
  useEffect(() => {
    p.value = withDelay(index * delayStep, withTiming(1, { duration, easing: Easing.out(Easing.ease) }));
  }, [p, index, delayStep, duration]);
  return style;
}

/**
 * Slow opacity crossfade loop (0 → 1 → 0, yoyo). Put `style` on the TOP layer of
 * two stacked gradients so the background gently shimmers between two tints.
 */
export function useCrossfadeLoop(duration = 7000) {
  const p = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: p.value }));
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [p, duration]);
  return style;
}

/**
 * Search-overlay entrance. The input sits still (positioned at the pill by the
 * caller) and only fades; the panel drops out from under it (fade + short slide +
 * subtle scale); the backdrop fades. Parent keeps the Modal mounted through the
 * exit (~180ms) before unmounting.
 */
export function useOverlayEntrance(visible: boolean) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = visible
      ? withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })
      : withTiming(0, { duration: 180 });
  }, [visible, progress]);

  const inputStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.25], [0, 1], Extrapolation.CLAMP),
  }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.2, 0.8], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-8, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.98, 1]) },
    ],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  return { inputStyle, backdropStyle, panelStyle };
}

/**
 * Collapsing hero driven by a scroll shared value. As the list scrolls from 0 to
 * `fullH - collapsedH`, the hero card shrinks from its measured full height to
 * `collapsedH` (just the search bar), the greeting+mascot row slides up and fades,
 * and the chips fade out. `progress` (0→1) is exposed for any extra tie-ins.
 *   - fullH: measured full hero-content height (shared value, from onLayout)
 *   - greetingH: measured greeting+mascot row height (shared value)
 *   - collapsedH: 18 + 50 + 18 = paddings + search bar row
 *   - gapAfterGreeting: the content gap between greeting and search bar
 */
export function useCollapsingHero(
  scrollY: SharedValue<number>,
  fullH: SharedValue<number>,
  greetingH: SharedValue<number>,
  collapsedH = 66, // 8 + 50 + 8 (slim paddings + search bar row)
  gapAfterGreeting = 16,
) {
  const PAD_SLIM = 10; // 18 → 8 vertical padding shed on collapse
  const HEADER_H = 56; // fixed header height — the bar takes its place
  const SHADOW_ORIG = 0.12; // card shadowOpacity at rest (matches home markup)
  const ELEV_ORIG = 4; // card elevation at rest (Android)

  const progress = useDerivedValue(() => {
    const dist = Math.max(fullH.value - collapsedH + HEADER_H, 1); // + header: bar edge tracks the finger 1:1, gap stays 24
    return interpolate(scrollY.value, [0, dist], [0, 1], Extrapolation.CLAMP);
  });
  const cardStyle = useAnimatedStyle(() => {
    const dist = Math.max(fullH.value - collapsedH + HEADER_H, 1); // + header: bar edge tracks the finger 1:1, gap stays 24
    const r = interpolate(progress.value, [0, 1], [24, 0], Extrapolation.CLAMP);
    return {
      height: interpolate(scrollY.value, [0, dist], [fullH.value, collapsedH], Extrapolation.CLAMP),
      // Four corners separately so top/bottom can be tuned independently later.
      borderTopLeftRadius: r,
      borderTopRightRadius: r,
      borderBottomLeftRadius: r,
      borderBottomRightRadius: r,
      // Fully drop the shadow when docked so nothing frames the search zone.
      shadowOpacity: interpolate(progress.value, [0.5, 1], [SHADOW_ORIG, 0], Extrapolation.CLAMP),
      elevation: interpolate(progress.value, [0.5, 1], [ELEV_ORIG, 0], Extrapolation.CLAMP),
    };
  });
  // Morph the side inset 16 → 0 so the card becomes a full-bleed bar when collapsed.
  const wrapperStyle = useAnimatedStyle(() => ({
    paddingHorizontal: interpolate(progress.value, [0, 1], [16, 0], Extrapolation.CLAMP),
  }));
  // Slide the content up so the search bar lands at y=8 when collapsed (greeting +
  // gap + the 10px of padding shed). Pure transform — no per-frame layout; the
  // bottom clips under the card's overflow:hidden.
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -(greetingH.value + gapAfterGreeting + PAD_SLIM) * progress.value }],
  }));
  const greetingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6], [1, 0], Extrapolation.CLAMP),
  }));
  const chipsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));
  // Header slides up + fades out; pointerEvents off so the hidden bell/RU can't be
  // tapped from under the status bar.
  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: -HEADER_H * progress.value }],
    pointerEvents: progress.value > 0.4 ? "none" : "auto",
  }));
  // The whole hero overlay rises by the header height, docking the bar under the status bar.
  const overlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -HEADER_H * progress.value }],
  }));
  // Card background (underlay + gradients) fades out on collapse → transparent dock:
  // the list scrolls behind the search pill, nothing frames it.
  const heroBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.25, 0.85], [1, 0], Extrapolation.CLAMP),
  }));
  // The search pill picks up a light shadow only once it's a free-floating docked bar.
  const pillShadowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(progress.value, [0.7, 1], [0, 0.12], Extrapolation.CLAMP),
    elevation: interpolate(progress.value, [0.7, 1], [0, 2], Extrapolation.CLAMP),
  }));
  return { progress, cardStyle, wrapperStyle, contentStyle, greetingStyle, chipsStyle, headerStyle, overlayStyle, heroBgStyle, pillShadowStyle };
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

/**
 * Pull-to-stretch for a banner/hero: drag down to stretch its height (rubber-band,
 * finger moves faster than the banner), release to spring back to baseHeight.
 * Attach `pan` via GestureDetector and `heroStyle` to the stretchable View.
 */
export function usePullStretch(baseHeight: number) {
  const stretch = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // down only, tight resistance (banner tracks the finger closely)
      if (e.translationY > 0) {
        stretch.value = e.translationY * 0.9;
      }
    })
    .onEnd(() => {
      // snappy spring back to the original height
      stretch.value = withSpring(0, { damping: 30, stiffness: 300 });
    });

  const heroStyle = useAnimatedStyle(() => ({
    height: baseHeight + stretch.value,
  }));

  // Image grows with the hero so no purple strip shows at the bottom.
  const imageStyle = useAnimatedStyle(() => ({
    height: 250 + stretch.value,
  }));

  return { pan, heroStyle, imageStyle };
}
