import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";

const TRACK_W = 52;
const TRACK_H = 32;
const THUMB = 26;
const PAD = 3;
const TRAVEL = TRACK_W - THUMB - PAD * 2; // thumb left→right distance

type Props = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
};

/**
 * Custom clay/3D switch: gradient track when on, grey track when off, with a
 * spring-animated white thumb. Drop-in replacement for the native Switch's
 * value / onValueChange. Purely visual — owns no form logic.
 */
export function ClayToggle({ value, onValueChange, disabled }: Props) {
  const { colors } = useTheme();
  const p = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    p.value = withSpring(value ? 1 : 0, { damping: 15 });
  }, [value, p]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * TRAVEL }] }));
  const gradStyle = useAnimatedStyle(() => ({ opacity: p.value }));

  return (
    <Pressable
      onPress={disabled ? undefined : () => onValueChange(!value)}
      disabled={disabled}
      style={{
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: TRACK_H / 2,
        backgroundColor: colors.border,
        justifyContent: "center",
        overflow: "hidden",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Gradient track — fades in when on */}
      <Animated.View style={[StyleSheet.absoluteFill, gradStyle]}>
        <LinearGradient colors={brand.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </Animated.View>

      {/* Thumb */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: PAD,
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: "#FFFFFF",
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          },
          thumbStyle,
        ]}
      />
    </Pressable>
  );
}
