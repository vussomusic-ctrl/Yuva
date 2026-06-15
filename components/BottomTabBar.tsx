import { View, Text, Pressable, Image } from "react-native";
import Animated, { useDerivedValue, useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useRouter, Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { usePressScale } from "../lib/animations";
import { useScrollCtx } from "../lib/scrollContext";

// Derive the prop type from expo-router's Tabs (v56 vendors its own bottom-tabs).
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

const TAB_META: Record<string, { image: number; labelKey: string }> = {
  home: { image: require("../assets/icons/tab-icons/home.png"), labelKey: "tabs.home" },
  search: { image: require("../assets/icons/tab-icons/search.png"), labelKey: "tabs.search" },
  chat: { image: require("../assets/icons/tab-icons/chat.png"), labelKey: "tabs.chat" },
  profile: { image: require("../assets/icons/tab-icons/profile.png"), labelKey: "tabs.profile" },
};

function TabItem({ meta, isFocused, tint, label, onPress, collapseProgress }: { meta: typeof TAB_META[string]; isFocused: boolean; tint: string; label: string; onPress: () => void; collapseProgress: SharedValue<number> }) {
  const press = usePressScale(0.9);
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseProgress.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
    height: interpolate(collapseProgress.value, [0, 1], [13, 0], Extrapolation.CLAMP),
  }));
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}>
      <Animated.View style={[{ alignItems: "center", gap: 2, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: isFocused ? "rgba(139,63,214,0.12)" : "transparent" }, press.style]}>
        <Image source={meta.image} style={{ width: 26, height: 26 }} resizeMode="contain" />
        <Animated.View style={labelStyle}>
          <Text style={{ fontSize: 11, fontFamily: font.semibold, color: tint }}>{label}</Text>
        </Animated.View>
        <View style={{ width: 16, height: 3, borderRadius: 2, marginTop: 0, backgroundColor: isFocused ? brand.violet : "transparent" }} />
      </Animated.View>
    </Pressable>
  );
}

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const addPress = usePressScale(0.92);
  const { scrollY } = useScrollCtx();

  // Collapse on scroll: 0 = expanded, 1 = collapsed (over the first 80px of scroll).
  const collapseProgress = useDerivedValue(() => interpolate(scrollY.value, [0, 80], [0, 1], Extrapolation.CLAMP));

  // Side margins grow as the bar collapses → panel narrows toward the center (+ stays anchored).
  const containerStyle = useAnimatedStyle(() => {
    const sideMargin = interpolate(collapseProgress.value, [0, 1], [16, 70]);
    return { left: sideMargin, right: sideMargin };
  });

  const glassBg = mode === "dark" ? "rgba(30,22,45,0.72)" : "rgba(250,245,255,0.82)";
  const topBorder = mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.5)";

  return (
    <Animated.View style={[{ position: "absolute", bottom: insets.bottom + 8, borderRadius: 30, shadowColor: brand.violet, shadowOffset: { width: 0, height: 6 }, shadowOpacity: mode === "dark" ? 0.3 : 0.18, shadowRadius: 20, elevation: 12 }, containerStyle]}>
      <View style={{ borderRadius: 30, overflow: "hidden", borderWidth: 1, borderColor: topBorder }}>
        <BlurView intensity={mode === "dark" ? 40 : 50} tint={mode === "dark" ? "dark" : "light"} style={{ flexDirection: "row", backgroundColor: glassBg, paddingTop: 5, paddingBottom: 5, paddingHorizontal: 8 }}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            // Center slot is a spacer — the raised + is rendered outside the clip layer.
            if (route.name === "add") {
              return <View key={route.key} style={{ flex: 1 }} />;
            }

            const meta = TAB_META[route.name];
            if (!meta) return <View key={route.key} style={{ flex: 1 }} />;

            const tint = isFocused ? brand.violet : colors.tabInactive;
            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            return <TabItem key={route.key} meta={meta} isFocused={isFocused} tint={tint} label={t(meta.labelKey)} onPress={onPress} collapseProgress={collapseProgress} />;
          })}
        </BlurView>
      </View>

      {/* Raised + — absolute sibling OUTSIDE the overflow:hidden layer (not clipped) */}
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: -22, alignItems: "center" }}>
        <Pressable onPress={() => router.push("/add-listing")} onPressIn={addPress.onPressIn} onPressOut={addPress.onPressOut}>
          <Animated.View style={addPress.style}>
            <Image source={require("../assets/icons/tab-icons/plus.png")} style={{ width: 54, height: 54 }} resizeMode="contain" />
          </Animated.View>
        </Pressable>
      </View>
    </Animated.View>
  );
}
