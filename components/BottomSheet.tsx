import { useEffect, useState } from "react";
import { Modal, View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../lib/theme/ThemeContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const OPEN_SPRING = { damping: 30, stiffness: 140, mass: 0.9, overshootClamping: false }; // soft Apple-feel glide
const CLOSE_DURATION = 200;
const FALLBACK_H = 600; // until the panel is measured (onLayout)
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

/**
 * Themed bottom sheet — Apple-Maps feel: spring slide-up, drag-the-grabber-down
 * to dismiss, backdrop that fades with the panel, soft top shadow. Built on RN
 * Modal (so it overlays everything) + reanimated. API unchanged: visible/onClose/children.
 */
export function BottomSheet({ visible, onClose, children }: Props) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);

  const translateY = useSharedValue(FALLBACK_H); // 0 = open, sheetH = fully off-screen
  const sheetH = useSharedValue(FALLBACK_H); // measured panel height

  // Drive open/close off `visible`.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = sheetH.value || FALLBACK_H; // start off-screen…
      translateY.value = withSpring(0, OPEN_SPRING); // …spring up
    } else if (mounted) {
      translateY.value = withTiming(sheetH.value || FALLBACK_H, { duration: CLOSE_DURATION }, (fin) => {
        if (fin) runOnJS(setMounted)(false); // unmount Modal only after the close animation
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Drag the grabber down to dismiss (handle-only → never fights inner scroll).
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY); // follow finger, only downward
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        runOnJS(onClose)(); // parent clears `visible` → the close effect animates from here + unmounts
      } else {
        translateY.value = withSpring(0, OPEN_SPRING); // snap back
      }
    });

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    // Fades with the panel: full when open (ty=0), gone when off-screen (ty=sheetH).
    opacity: interpolate(translateY.value, [0, sheetH.value || FALLBACK_H], [1, 0], Extrapolation.CLAMP),
  }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }, backdropStyle]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>

      {/* Outer — shadow + rounded shape (NO overflow, so the soft shadow isn't clipped) */}
      <Animated.View
        onLayout={(e) => {
          sheetH.value = e.nativeEvent.layout.height;
        }}
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 12,
          },
          panelStyle,
        ]}
      >
        {/* Inner — frosted glass; overflow hidden clips the blur to the rounded top */}
        <View
          style={{
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            borderTopWidth: 1,
            borderColor: mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.5)",
            paddingBottom: insets.bottom + 12,
          }}
        >
          <BlurView intensity={45} tint={mode === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          {/* Tint wash so text stays legible over busy backgrounds */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: mode === "dark" ? "rgba(28,28,30,0.55)" : "rgba(255,255,255,0.55)" }]} />

          {/* Grabber — drag down to dismiss */}
          <GestureDetector gesture={pan}>
            <View style={{ paddingTop: 10, paddingBottom: 4 }}>
              <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>
          </GestureDetector>
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}
