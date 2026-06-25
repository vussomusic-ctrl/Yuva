import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { useAuth, authErrorKey } from "../lib/auth";
import { formatAzPhone, azRawPhone, isValidAzPhone } from "../lib/phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PhoneRegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signInWithPhone } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(formatAzPhone("")); // masked display; +994 prefix fixed
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/welcome"));

  const onSubmit = async () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = t("createAccount.errName");
    if (email.trim() && !EMAIL_RE.test(email.trim())) next.email = t("createAccount.errEmail"); // optional — validate only if filled
    if (!isValidAzPhone(phone)) next.phone = t("createAccount.errPhone"); // exactly 9 national digits

    setErrors(next);
    setAuthError(null);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    // Name/email/role ride along as metadata → handle_new_user writes them into
    // profiles once the OTP is verified (so no need to carry them to verify-otp).
    const raw = azRawPhone(phone); // clean E.164 for auth (mask is display-only)
    const { error } = await signInWithPhone(raw, {
      full_name: name.trim(),
      email: email.trim() || undefined,
      role: "user",
    });
    setSubmitting(false);
    if (error) {
      setAuthError(t(authErrorKey(error)));
      return;
    }
    router.push({ pathname: "/verify-otp", params: { phone: raw } });
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
          <Pressable onPress={goBack} hitSlop={12} style={({ pressed }) => ({ alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}>
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
                source={require("../assets/auth/bird-key.png")}
                resizeMode="contain"
                style={[{ width: 220, height: 220, alignSelf: "center", marginTop: -20, marginBottom: 0 }, heroStyle]}
              />

              <Text style={{ fontFamily: font.extrabold, fontSize: 30, letterSpacing: -0.5, textAlign: "center", marginTop: 8, color: "#FFFFFF" }}>
                {t("auth.phoneRegTitle")}
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 8, marginBottom: 24, color: "rgba(255,255,255,0.9)" }}>
                {t("auth.phoneRegSubtitle")}
              </Text>

              <Field
                icon="person-outline"
                placeholder={t("createAccount.fullNamePlaceholder")}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
                }}
                error={errors.name}
                autoCapitalize="words"
              />
              <Field
                icon="mail-outline"
                placeholder={t("createAccount.emailOptional")}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                }}
                error={errors.email}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Field
                icon="call-outline"
                placeholder={t("createAccount.phonePlaceholder")}
                value={phone}
                onChangeText={(v) => {
                  setPhone(formatAzPhone(v)); // mask as they type; raw derived on submit
                  if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
                }}
                error={errors.phone}
                keyboardType="phone-pad"
                autoComplete="tel"
              />

              {authError && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12 }}>
                  <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
                  <Text style={{ flex: 1, color: "#FFFFFF", fontFamily: font.regular, fontSize: 13 }}>{authError}</Text>
                </View>
              )}
            </Animated.View>

            <Animated.View style={btnStyle}>
              {/* PRIMARY — white pill (welcome style) */}
              <Pressable onPress={onSubmit} disabled={submitting} style={({ pressed }) => ({ marginTop: 20, opacity: pressed || submitting ? 0.9 : 1 })}>
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
                    {submitting ? t("auth.sendingCode") : t("auth.registerContinue")}
                  </Text>
                  {!submitting && <Ionicons name="arrow-forward" size={18} color={brand.violet} />}
                </View>
              </Pressable>

              {/* Footer — already have an account */}
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 }}>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontFamily: font.regular, fontSize: 14 }}>{t("auth.haveAccount")} </Text>
                <Pressable onPress={() => router.replace("/phone-login")} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                  <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 15 }}>{t("welcome.login")}</Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

type FieldProps = {
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
} & TextInputProps;

// White capsule input on the gradient (no label, no colored border). letterSpacing:0
// guards against the placeholder font-fallback spacing seen on iOS.
function Field({ icon, error, ...inputProps }: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ position: "relative", justifyContent: "center" }}>
        <Ionicons name={icon} size={20} color={brand.violet} style={{ position: "absolute", left: 16, zIndex: 1 }} />
        <TextInput
          {...inputProps}
          placeholderTextColor="#9AA0A6"
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 0,
            borderRadius: 18,
            paddingLeft: 48,
            paddingRight: 16,
            paddingVertical: 16,
            fontFamily: font.regular,
            fontSize: 16,
            color: "#1B1B1F",
            letterSpacing: 0,
          }}
        />
      </View>
      {error && <Text style={{ color: "#FFE3E3", fontFamily: font.regular, fontSize: 12, marginTop: 6, marginLeft: 4 }}>{error}</Text>}
    </View>
  );
}
