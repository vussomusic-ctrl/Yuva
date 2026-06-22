import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing } from "react-native-reanimated";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { useAuth, authErrorKey } from "../lib/auth";

export default function VerifyOtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signInWithPhone, verifyPhoneOtp } = useAuth();
  const { phone: phoneParam } = useLocalSearchParams<{ phone?: string }>();
  const phone = typeof phoneParam === "string" ? phoneParam : "";

  const [code, setCode] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds until resend allowed

  const cx1 = useSharedValue(0);
  const cx2 = useSharedValue(0);
  const heroY = useSharedValue(0);
  const heroS = useSharedValue(1);
  const introOpacity = useSharedValue(0);
  const introY = useSharedValue(16);
  const btnOpacity = useSharedValue(0);
  const btnY = useSharedValue(16);

  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);
    cx1.value = withRepeat(withTiming(30, { duration: 6500, easing: ease }), -1, true);
    cx2.value = withRepeat(withTiming(-36, { duration: 8000, easing: ease }), -1, true);
    heroY.value = withRepeat(withTiming(-10, { duration: 2800, easing: ease }), -1, true);
    heroS.value = withRepeat(withTiming(1.02, { duration: 3400, easing: ease }), -1, true);
    const out = Easing.out(Easing.ease);
    introOpacity.value = withTiming(1, { duration: 500, easing: out });
    introY.value = withTiming(0, { duration: 500, easing: out });
    btnOpacity.value = withDelay(120, withTiming(1, { duration: 500, easing: out }));
    btnY.value = withDelay(120, withTiming(0, { duration: 500, easing: out }));
  }, []);

  const cloud1Style = useAnimatedStyle(() => ({ transform: [{ translateX: cx1.value }] }));
  const cloud2Style = useAnimatedStyle(() => ({ transform: [{ translateX: cx2.value }] }));
  const heroStyle = useAnimatedStyle(() => ({ transform: [{ translateY: heroY.value }, { scale: heroS.value }] }));
  const introStyle = useAnimatedStyle(() => ({ opacity: introOpacity.value, transform: [{ translateY: introY.value }] }));
  const btnStyle = useAnimatedStyle(() => ({ opacity: btnOpacity.value, transform: [{ translateY: btnY.value }] }));

  // Tick the resend cooldown down to 0.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const onVerify = async () => {
    if (submitting || code.length < 4) return;
    setAuthError(null);
    setSubmitting(true);
    const { error } = await verifyPhoneOtp(phone, code.trim());
    setSubmitting(false);
    if (error) {
      setAuthError(t(authErrorKey(error)));
      return;
    }
    router.replace("/home"); // session minted by verifyOtp → gate lets through
  };

  const onResend = async () => {
    if (cooldown > 0) return;
    setAuthError(null);
    setResent(false);
    const { error } = await signInWithPhone(phone);
    if (error) {
      setAuthError(t(authErrorKey(error)));
      return;
    }
    setResent(true);
    setCooldown(30);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#8A3BB5" }}>
      {/* Background — gradient sky/city (no extra tint) */}
      <Image source={require("../assets/welcome/welcome-bg.png")} style={StyleSheet.absoluteFill} resizeMode="cover" />

      {/* Clouds — upper sky, gentle drift */}
      <Animated.Image source={require("../assets/welcome/cloud-1.png")} style={[{ position: "absolute", top: "9%", left: "-5%", width: 130, height: 84 }, cloud1Style]} resizeMode="contain" />
      <Animated.Image source={require("../assets/welcome/cloud-2.png")} style={[{ position: "absolute", top: "10%", right: "-3%", width: 100, height: 66 }, cloud2Style]} resizeMode="contain" />

      <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top", "bottom"]}>
        {/* Contextual header — back only, no logo */}
        <View style={{ height: 56, justifyContent: "center", paddingHorizontal: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 32, flexGrow: 1, justifyContent: "center" }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={introStyle}>
              <Animated.Image
                source={require("../assets/auth/bird-lock.png")}
                resizeMode="contain"
                style={[{ width: 420, height: 420, alignSelf: "center", marginTop: -32, marginBottom: -48 }, heroStyle]}
              />

              <Text style={{ fontFamily: font.extrabold, fontSize: 30, letterSpacing: -0.5, textAlign: "center", color: "#FFFFFF" }}>
                {t("auth.otpTitle")}
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 8, marginBottom: 24, color: "rgba(255,255,255,0.9)" }}>
                {t("auth.otpSubtitle", { phone })}
              </Text>

              {/* Code — centered, large (letterSpacing:8 = code dots spacing, intentional) */}
              <TextInput
                value={code}
                onChangeText={(v) => {
                  setCode(v.replace(/[^\d]/g, "").slice(0, 6));
                  if (authError) setAuthError(null);
                }}
                placeholder="••••••"
                placeholderTextColor="#9AA0A6"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={{
                  backgroundColor: "#FFFFFF",
                  borderWidth: 0,
                  borderRadius: 18,
                  paddingVertical: 16,
                  textAlign: "center",
                  fontFamily: font.extrabold,
                  fontSize: 28,
                  letterSpacing: 8,
                  color: "#1B1B1F",
                }}
              />

              {authError && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12 }}>
                  <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
                  <Text style={{ flex: 1, color: "#FFFFFF", fontFamily: font.regular, fontSize: 13 }}>{authError}</Text>
                </View>
              )}
            </Animated.View>

            <Animated.View style={btnStyle}>
              {/* PRIMARY — white pill (welcome style) */}
              <Pressable onPress={onVerify} disabled={submitting} style={({ pressed }) => ({ marginTop: 20, opacity: pressed || submitting ? 0.9 : 1 })}>
                <View
                  style={{
                    height: 58,
                    borderRadius: 28,
                    backgroundColor: "#FFFFFF",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.18,
                    shadowRadius: 12,
                    elevation: 5,
                  }}
                >
                  {submitting && <ActivityIndicator size="small" color={brand.violet} />}
                  <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 17 }}>
                    {submitting ? t("auth.verifying") : t("auth.verify")}
                  </Text>
                </View>
              </Pressable>

              {/* Resend */}
              <View style={{ alignItems: "center", marginTop: 24, gap: 6 }}>
                {resent && <Text style={{ color: "rgba(255,255,255,0.9)", fontFamily: font.regular, fontSize: 13 }}>{t("auth.resent")}</Text>}
                <Pressable onPress={onResend} disabled={cooldown > 0} hitSlop={8} style={({ pressed }) => ({ opacity: cooldown > 0 ? 0.45 : pressed ? 0.6 : 1 })}>
                  <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 15 }}>
                    {cooldown > 0 ? t("auth.resendIn", { sec: cooldown }) : t("auth.resend")}
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
