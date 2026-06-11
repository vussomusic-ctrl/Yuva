import { useState } from "react";
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
  TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { useAuth, authErrorKey } from "../lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/welcome"));

  const onSubmit = async () => {
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = t("createAccount.errEmail");
    if (!password) next.password = t("createAccount.errPassword");

    setErrors(next);
    setAuthError(null);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      setAuthError(t(authErrorKey(error)));
      return;
    }
    router.replace("/home");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top", "bottom"]}>
      {/* Contextual header — back only, no logo (per brand rules) */}
      <View style={{ height: 56, justifyContent: "center", paddingHorizontal: 12 }}>
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={({ pressed }) => ({ padding: 8, alignSelf: "flex-start", opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero illustration */}
          <Image
            source={require("../assets/auth/envelope-house.png")}
            resizeMode="contain"
            style={{ width: 140, height: 140, alignSelf: "center", marginTop: 4, marginBottom: 8 }}
          />

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: mode === "dark" ? 0.4 : 0.08,
              shadowRadius: 24,
              elevation: 6,
            }}
          >
            <Text
              style={{
                fontFamily: font.extrabold,
                fontSize: 30,
                letterSpacing: -0.5,
                textAlign: "center",
                color: colors.text,
              }}
            >
              {t("auth.loginTitle")}
            </Text>
            <Text
              style={{
                fontFamily: font.regular,
                fontSize: 14,
                lineHeight: 20,
                textAlign: "center",
                marginTop: 8,
                marginBottom: 24,
                color: colors.textSecondary,
              }}
            >
              {t("auth.loginSubtitle")}
            </Text>

            <Field
              colors={colors}
              label={t("createAccount.emailLabel")}
              icon="mail-outline"
              placeholder={t("createAccount.emailPlaceholder")}
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
              colors={colors}
              label={t("createAccount.passwordLabel")}
              icon="lock-closed-outline"
              placeholder={t("createAccount.passwordPlaceholder")}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              error={errors.password}
              autoCapitalize="none"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowPassword((s) => !s)}
            />

            {/* Auth error (e.g. invalid credentials) */}
            {authError && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 8,
                  backgroundColor: mode === "dark" ? "#2A1416" : "#FCE8E8",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Ionicons name="alert-circle" size={20} color="#BA1A1A" />
                <Text style={{ flex: 1, color: mode === "dark" ? "#F2B8B5" : "#8C1D18", fontFamily: font.regular, fontSize: 13 }}>
                  {authError}
                </Text>
              </View>
            )}

            {/* PRIMARY — brand gradient */}
            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              style={({ pressed }) => ({ marginTop: 20, opacity: pressed || submitting ? 0.9 : 1 })}
            >
              <LinearGradient
                colors={brand.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  shadowColor: brand.violet,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 4,
                }}
              >
                {submitting && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 17 }}>
                  {submitting ? t("auth.signingIn") : t("auth.loginSubmit")}
                </Text>
                {!submitting && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
              </LinearGradient>
            </Pressable>

            {/* Footer — no account yet */}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 }}>
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>
                {t("auth.noAccount")}{" "}
              </Text>
              <Pressable
                onPress={() => router.replace("/create-account")}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 15 }}>
                  {t("auth.signUpLink")}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  colors: Theme;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
} & TextInputProps;

function Field({ colors, label, icon, error, rightIcon, onRightIconPress, ...inputProps }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? "#BA1A1A" : focused ? brand.violet : colors.border;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 12,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: colors.textSecondary,
          marginBottom: 8,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>
      <View style={{ position: "relative", justifyContent: "center" }}>
        <Ionicons
          name={icon}
          size={20}
          color={focused ? brand.violet : colors.textSecondary}
          style={{ position: "absolute", left: 16, zIndex: 1 }}
        />
        <TextInput
          {...inputProps}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.textSecondary}
          style={{
            backgroundColor: colors.bg,
            borderWidth: 1.5,
            borderColor,
            borderRadius: 16,
            paddingLeft: 48,
            paddingRight: rightIcon ? 48 : 16,
            paddingVertical: 14,
            fontFamily: font.regular,
            fontSize: 16,
            color: colors.text,
          }}
        />
        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            hitSlop={10}
            style={{ position: "absolute", right: 14, padding: 2 }}
          >
            <Ionicons name={rightIcon} size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
      {error && (
        <Text style={{ color: "#BA1A1A", fontFamily: font.regular, fontSize: 12, marginTop: 6, marginLeft: 4 }}>{error}</Text>
      )}
    </View>
  );
}
