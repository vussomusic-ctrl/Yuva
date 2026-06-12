import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  useWindowDimensions,
  ImageSourcePropType,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { PrimaryButton } from "../components/Button";
import { useMountFadeScale } from "../lib/animations";
import { set, ONBOARDING_SEEN } from "../lib/storage";

const SLIDES: { image: ImageSourcePropType; titleKey: string; descKey: string }[] = [
  { image: require("../assets/icons/onboarding/onboarding-search.png"), titleKey: "onboarding.slide1Title", descKey: "onboarding.slide1Desc" },
  { image: require("../assets/icons/onboarding/onboarding-chat.png"), titleKey: "onboarding.slide2Title", descKey: "onboarding.slide2Desc" },
  { image: require("../assets/icons/onboarding/onboarding-publish.png"), titleKey: "onboarding.slide3Title", descKey: "onboarding.slide3Desc" },
];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  // Mark seen once, then hand off to the auth landing. Seen-flag write is
  // best-effort (lib/storage swallows errors), so navigation never blocks on it.
  const finish = () => {
    set(ONBOARDING_SEEN, "1");
    router.replace("/welcome");
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const next = () => {
    if (last) finish();
    else scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      {/* Skip — hidden on the last slide */}
      <View style={{ height: 44, justifyContent: "center", alignItems: "flex-end", paddingHorizontal: 20 }}>
        {!last && (
          <Pressable onPress={finish} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 15 }}>{t("onboarding.skip")}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <Slide key={s.titleKey} width={width} image={s.image} title={t(s.titleKey)} desc={t(s.descKey)} colors={colors} />
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 20 }}>
        {SLIDES.map((s, i) => (
          <Dot key={s.titleKey} active={i === index} colors={colors} />
        ))}
      </View>

      {/* Next / Get started */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
        <PrimaryButton label={t(last ? "onboarding.start" : "onboarding.next")} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

function Slide({
  width,
  image,
  title,
  desc,
  colors,
}: {
  width: number;
  image: ImageSourcePropType;
  title: string;
  desc: string;
  colors: Theme;
}) {
  const enter = useMountFadeScale();
  return (
    <View style={{ width, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 24 }}>
      <Animated.View style={enter}>
        <Image source={image} resizeMode="contain" style={{ width: width * 0.7, height: width * 0.7 }} />
      </Animated.View>
      <Text style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 26, textAlign: "center" }}>{title}</Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: font.regular,
          fontSize: 15,
          lineHeight: 22,
          textAlign: "center",
          maxWidth: 300,
        }}
      >
        {desc}
      </Text>
    </View>
  );
}

function Dot({ active, colors }: { active: boolean; colors: Theme }) {
  const w = useSharedValue(active ? 22 : 8);
  useEffect(() => {
    w.value = withTiming(active ? 22 : 8, { duration: 220 });
  }, [active, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View
      style={[{ height: 8, borderRadius: 4, backgroundColor: active ? brand.violet : colors.border }, style]}
    />
  );
}
