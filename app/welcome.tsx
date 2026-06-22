import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, Alert, StyleSheet, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing, runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { useLanguage } from "../lib/i18n/languages";

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { current, languages, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);

  const cx1 = useSharedValue(0);
  const cx2 = useSharedValue(0);
  const logoY = useSharedValue(0);
  const logoS = useSharedValue(1);
  const introOpacity = useSharedValue(0);
  const introY = useSharedValue(12);
  const btnOpacity = useSharedValue(0);
  const btnY = useSharedValue(16);
  const langAnim = useSharedValue(0); // language dropdown open/close (0→1)

  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);
    cx1.value = withRepeat(withTiming(36, { duration: 6000, easing: ease }), -1, true);
    cx2.value = withRepeat(withTiming(-42, { duration: 7500, easing: ease }), -1, true);
    logoY.value = withRepeat(withTiming(-8, { duration: 2600, easing: ease }), -1, true);
    logoS.value = withRepeat(withTiming(1.02, { duration: 3200, easing: ease }), -1, true);
    const out = Easing.out(Easing.ease);
    introOpacity.value = withTiming(1, { duration: 500, easing: out });
    introY.value = withTiming(0, { duration: 500, easing: out });
    btnOpacity.value = withDelay(150, withTiming(1, { duration: 500, easing: out }));
    btnY.value = withDelay(150, withTiming(0, { duration: 500, easing: out }));
  }, []);

  const cloud1Style = useAnimatedStyle(() => ({ transform: [{ translateX: cx1.value }] }));
  const cloud2Style = useAnimatedStyle(() => ({ transform: [{ translateX: cx2.value }] }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ translateY: logoY.value }, { scale: logoS.value }] }));
  const introStyle = useAnimatedStyle(() => ({ opacity: introOpacity.value, transform: [{ translateY: introY.value }] }));
  const btnBlockStyle = useAnimatedStyle(() => ({ opacity: btnOpacity.value, transform: [{ translateY: btnY.value }] }));
  const dropdownStyle = useAnimatedStyle(() => ({
    opacity: langAnim.value,
    transform: [
      { translateY: (1 - langAnim.value) * -8 },
      { scaleY: 0.85 + langAnim.value * 0.15 },
    ],
  }));

  // Mount on open + animate in; animate out then unmount (runOnJS after timing).
  const openLang = () => {
    setLangOpen(true);
    langAnim.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
  };
  const closeLang = () => {
    langAnim.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) runOnJS(setLangOpen)(false);
    });
  };
  const toggleLang = () => (langOpen ? closeLang() : openLang());

  return (
    <View style={{ flex: 1, backgroundColor: "#8A3BB5" }}>
      <StatusBar style="light" />

      <Image source={require("../assets/welcome/welcome-bg.png")} style={StyleSheet.absoluteFill} resizeMode="cover" />

      {/* Soft bottom darkening so the buttons read over the city, no hard line */}
      <LinearGradient
        colors={["transparent", "rgba(75,20,110,0.0)", "rgba(75,20,110,0.85)"]}
        locations={[0, 0.45, 1]}
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" }}
        pointerEvents="none"
      />

      <Animated.Image source={require("../assets/welcome/cloud-1.png")} style={[{ position: "absolute", top: "8%", left: "-6%", width: 140, height: 90 }, cloud1Style]} resizeMode="contain" />
      <Animated.Image source={require("../assets/welcome/cloud-2.png")} style={[{ position: "absolute", top: "11%", right: "-4%", width: 110, height: 72 }, cloud2Style]} resizeMode="contain" />

      <Animated.View style={[{ position: "absolute", top: "18%", left: 0, right: 0, alignItems: "center", paddingHorizontal: 28 }, introStyle]}>
        <Animated.Image source={require("../assets/welcome/logo-yuva.png")} style={[{ width: "74%", height: 130 }, logoStyle]} resizeMode="contain" />
        <Text style={{ fontFamily: font.regular, fontSize: 18, lineHeight: 24, textAlign: "center", maxWidth: 320, marginTop: 12, color: "rgba(255,255,255,0.92)" }}>
          {t("welcome.subtitle")}
        </Text>
      </Animated.View>

      {/* Language switcher — pill, top-right, above everything */}
      <Pressable
        onPress={toggleLang}
        style={({ pressed }) => ({
          position: "absolute",
          top: 56,
          right: 16,
          zIndex: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 14,
          height: 38,
          borderRadius: 19,
          backgroundColor: "rgba(255,255,255,0.16)",
          borderWidth: 1.5,
          borderColor: "rgba(255,255,255,0.5)",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="globe-outline" size={18} color="#FFFFFF" />
        <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 14 }}>{current.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
      </Pressable>

      {/* Glass language dropdown — opens downward from the pill */}
      {langOpen && (
        <>
          <Pressable onPress={closeLang} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 19 }} />
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 104,
                right: 16,
                zIndex: 20,
                width: 120,
                borderRadius: 18,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.35)",
                transformOrigin: "top",
              },
              dropdownStyle,
            ]}
          >
            <BlurView intensity={40} tint="light" style={{ paddingVertical: 6 }}>
              {languages.map((l, i) => {
                const active = l.code === current;
                return (
                  <Pressable
                    key={l.code}
                    onPress={() => {
                      setLanguage(l.code);
                      closeLang();
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                      backgroundColor: pressed ? "rgba(255,255,255,0.25)" : "transparent",
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderColor: "rgba(255,255,255,0.25)",
                    })}
                  >
                    <Text style={{ color: active ? "#FFFFFF" : "rgba(255,255,255,0.92)", fontFamily: active ? font.bold : font.medium, fontSize: 15 }}>
                      {l.code.toUpperCase()}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                  </Pressable>
                );
              })}
            </BlurView>
          </Animated.View>
        </>
      )}

      <SafeAreaView style={{ flex: 1, justifyContent: "flex-end" }} edges={["bottom"]}>
        <Animated.View style={[{ paddingHorizontal: 28, paddingBottom: height * 0.12, gap: 12 }, btnBlockStyle]}>
          <WelcomeButton variant="primary" icon="call-outline" label={t("welcome.loginByPhone")} onPress={() => router.push("/phone-login")} />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.4)" }} />
            <Text style={{ color: "#FFFFFF", fontFamily: font.regular, fontSize: 13 }}>{t("welcome.orDivider")}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.4)" }} />
          </View>

          <WelcomeButton variant="outline" icon="logo-apple" label={t("welcome.loginApple")} disabled onPress={() => Alert.alert(t("welcome.comingSoon"))} />
          <WelcomeButton variant="outline" icon="logo-google" label={t("welcome.loginGoogle")} disabled onPress={() => Alert.alert(t("welcome.comingSoon"))} />

          <Pressable onPress={() => router.push("/phone-register")} style={({ pressed }) => ({ paddingVertical: 8, alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: "rgba(255,255,255,0.92)" }}>
              {t("auth.noAccount")} <Text style={{ fontFamily: font.bold, color: "#FFFFFF" }}>{t("welcome.register")}</Text>
            </Text>
          </Pressable>

          <Pressable onPress={() => router.replace("/home")} style={({ pressed }) => ({ paddingVertical: 4, alignItems: "center", opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "rgba(255,255,255,0.85)" }}>{t("welcome.continueGuest")} →</Text>
          </Pressable>

          {/* Legal — preserved as-is (terms/privacy underlined links) */}
          <Text
            style={{
              fontFamily: font.regular,
              fontSize: 11,
              lineHeight: 16,
              textAlign: "center",
              maxWidth: 320,
              alignSelf: "center",
              marginTop: 4,
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {t("welcome.legalPre")}
            <Text style={{ color: "#FFFFFF", textDecorationLine: "underline" }}>{t("welcome.terms")}</Text>
            {t("welcome.legalAnd")}
            <Text style={{ color: "#FFFFFF", textDecorationLine: "underline" }}>{t("welcome.privacy")}</Text>
            {t("welcome.legalEnd")}
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function WelcomeButton({ variant, icon, label, disabled, onPress }: {
  variant: "primary" | "outline";
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const primary = variant === "primary";
  const fg = primary ? brand.violet : "#FFFFFF";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: disabled ? 0.6 : pressed ? 0.85 : 1 })}>
      <View
        style={{
          flexDirection: "row", gap: 10, height: 58, borderRadius: 28,
          alignItems: "center", justifyContent: "center",
          backgroundColor: primary ? "#FFFFFF" : "rgba(255,255,255,0.16)",
          borderWidth: primary ? 0 : 1.5,
          borderColor: primary ? "transparent" : "rgba(255,255,255,0.7)",
          ...(primary
            ? { shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 }
            : null),
        }}
      >
        {icon && <Ionicons name={icon} size={20} color={fg} />}
        <Text style={{ fontFamily: font.bold, fontSize: 16, color: fg }}>{label}</Text>
      </View>
    </Pressable>
  );
}
