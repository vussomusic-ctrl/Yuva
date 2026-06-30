import { useEffect, useRef, useState } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, type SharedValue } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";

type Props = {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChange: (lo: number, hi: number) => void; // fired on thumb release (final commit)
  onLiveChange?: (lo: number, hi: number) => void; // fired every drag frame (light UI sync)
  step?: number;
  histogram?: number[]; // bar heights drawn above the track (optional)
  formatLabel?: (v: number) => string;
};

const THUMB = 24;
const TRACK = 4;
const HISTO_H = 44;
const MIN_GAP = 6; // px — keep the thumbs from crossing

/**
 * Dual-range slider with an optional histogram. Pure reanimated + gesture-handler
 * (no slider lib). Thumbs drive shared values on the UI thread; `onChange` fires
 * with the snapped values on release. The active range + in-range histogram bars
 * recolor live while dragging.
 */
export function RangeSlider({ min, max, valueMin, valueMax, onChange, onLiveChange, step = 1, histogram, formatLabel = String }: Props) {
  const { colors } = useTheme();
  const [trackW, setTrackW] = useState(0);

  const loX = useSharedValue(0);
  const hiX = useSharedValue(0);
  const startLo = useSharedValue(0);
  const startHi = useSharedValue(0);

  const range = max - min || 1;
  const clamp = (v: number) => Math.max(min, Math.min(v, max));
  const valueToX = (v: number) => Math.max(0, Math.min(((clamp(v) - min) / range) * trackW, trackW));
  const xToValue = (x: number) => {
    const raw = min + (x / (trackW || 1)) * range;
    const snapped = Math.round(raw / step) * step;
    return Math.min(max, Math.max(min, snapped));
  };
  // Live label values (mirror the thumbs while dragging).
  const [liveMin, setLiveMin] = useState(valueMin);
  const [liveMax, setLiveMax] = useState(valueMax);
  const draggingRef = useRef(false);

  const startDrag = () => { draggingRef.current = true; };
  const emitLive = () => {
    const lo = xToValue(loX.value);
    const hi = xToValue(hiX.value);
    setLiveMin(lo);
    setLiveMax(hi);
    onLiveChange?.(lo, hi);
  };
  const endDrag = () => {
    draggingRef.current = false;
    const lo = xToValue(loX.value);
    const hi = xToValue(hiX.value);
    setLiveMin(lo);
    setLiveMax(hi);
    onChange(lo, hi);
  };

  // Sync from props when the track is measured / the parent commits new values.
  // Skip the thumb resync WHILE dragging (the gesture owns positions) so live
  // updates don't fight the drag — only mirror the labels.
  useEffect(() => {
    if (trackW > 0 && !draggingRef.current) {
      loX.value = valueToX(valueMin);
      hiX.value = valueToX(valueMax);
    }
    setLiveMin(valueMin);
    setLiveMax(valueMax);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackW, valueMin, valueMax, min, max]);

  const onTrackLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

  const loPan = Gesture.Pan()
    .onStart(() => { startLo.value = loX.value; runOnJS(startDrag)(); })
    .onUpdate((e) => {
      let nx = startLo.value + e.translationX;
      if (nx < 0) nx = 0;
      if (nx > hiX.value - MIN_GAP) nx = hiX.value - MIN_GAP;
      loX.value = nx;
      runOnJS(emitLive)();
    })
    .onEnd(() => { runOnJS(endDrag)(); });

  const hiPan = Gesture.Pan()
    .onStart(() => { startHi.value = hiX.value; runOnJS(startDrag)(); })
    .onUpdate((e) => {
      let nx = startHi.value + e.translationX;
      if (nx > trackW) nx = trackW;
      if (nx < loX.value + MIN_GAP) nx = loX.value + MIN_GAP;
      hiX.value = nx;
      runOnJS(emitLive)();
    })
    .onEnd(() => { runOnJS(endDrag)(); });

  const activeStyle = useAnimatedStyle(() => ({ left: loX.value, width: Math.max(0, hiX.value - loX.value) }));
  const loThumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: loX.value - THUMB / 2 }] }));
  const hiThumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: hiX.value - THUMB / 2 }] }));

  const histoMax = histogram && histogram.length ? Math.max(...histogram, 1) : 1;

  return (
    <View>
      {/* Histogram — bars in the selected range light up */}
      {histogram && histogram.length > 0 && (
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: HISTO_H, marginBottom: 6 }}>
          {histogram.map((h, i) => (
            <HistogramBar
              key={i}
              loX={loX}
              hiX={hiX}
              centerX={((i + 0.5) / histogram.length) * trackW}
              barH={Math.max(3, (h / histoMax) * HISTO_H)}
            />
          ))}
        </View>
      )}

      {/* Track + thumbs */}
      <View onLayout={onTrackLayout} style={{ height: THUMB, justifyContent: "center" }}>
        {/* Base line */}
        <View style={{ position: "absolute", left: 0, right: 0, height: TRACK, borderRadius: TRACK / 2, backgroundColor: colors.border }} />
        {/* Active segment (brand gradient) */}
        <Animated.View style={[{ position: "absolute", height: TRACK, borderRadius: TRACK / 2, overflow: "hidden" }, activeStyle]}>
          <LinearGradient colors={brand.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>

        {/* Left thumb */}
        <GestureDetector gesture={loPan}>
          <Animated.View style={[thumbBase, loThumbStyle]} hitSlop={12} />
        </GestureDetector>
        {/* Right thumb */}
        <GestureDetector gesture={hiPan}>
          <Animated.View style={[thumbBase, hiThumbStyle]} hitSlop={12} />
        </GestureDetector>
      </View>

      {/* Committed value labels (От on the left, До on the right) */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 13 }}>{formatLabel(liveMin)}</Text>
        <Text style={{ color: colors.text, fontFamily: font.semibold, fontSize: 13 }}>{formatLabel(liveMax)}</Text>
      </View>
    </View>
  );
}

function HistogramBar({ loX, hiX, centerX, barH }: { loX: SharedValue<number>; hiX: SharedValue<number>; centerX: number; barH: number }) {
  const style = useAnimatedStyle(() => {
    const active = centerX >= loX.value && centerX <= hiX.value;
    return { backgroundColor: active ? brand.violet : "rgba(139,63,214,0.16)" };
  });
  return <Animated.View style={[{ flex: 1, marginHorizontal: 1, height: barH, borderRadius: 2 }, style]} />;
}

const thumbBase = {
  position: "absolute",
  left: 0,
  width: THUMB,
  height: THUMB,
  borderRadius: THUMB / 2,
  backgroundColor: "#FFFFFF",
  borderWidth: 2.5,
  borderColor: brand.violet,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 4,
} as const;

/*
 * Demo usage (in a screen):
 *
 * const [lo, setLo] = useState(100000);
 * const [hi, setHi] = useState(900000);
 * <RangeSlider
 *   min={0}
 *   max={1000000}
 *   valueMin={lo}
 *   valueMax={hi}
 *   step={5000}
 *   histogram={[2, 5, 9, 14, 20, 16, 11, 7, 4, 2]}
 *   formatLabel={(v) => `${v.toLocaleString("en-US")} ₼`}
 *   onChange={(l, h) => { setLo(l); setHi(h); }}
 * />
 */
