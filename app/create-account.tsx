import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateAccountScreen() {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+994");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; password?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/welcome"));

  const onSubmit = () => {
    const next: typeof errors = {};
    if (!fullName.trim()) next.name = t("createAccount.errName");
    if (!EMAIL_RE.test(email.trim())) next.email = t("createAccount.errEmail");
    if (phone.replace(/[^\d]/g, "").length < 9) next.phone = t("createAccount.errPhone");
    if (!password) next.password = t("createAccount.errPassword");

    setErrors(next);
    setSubmitted(false);

    if (Object.keys(next).length === 0) {
      // No backend yet — Supabase sign-up wired up later.
      setSubmitted(true);
    }
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
            {/* Title */}
            <Text
              style={{
                fontSize: 30,
                fontWeight: "800",
                letterSpacing: -0.5,
                textAlign: "center",
                color: colors.text,
              }}
            >
              {t("createAccount.title")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                textAlign: "center",
                marginTop: 8,
                marginBottom: 24,
                color: colors.textSecondary,
              }}
            >
              {t("createAccount.subtitle")}
            </Text>

            {/* Fields */}
            <Field
              colors={colors}
              label={t("createAccount.fullNameLabel")}
              icon="person-outline"
              placeholder={t("createAccount.fullNamePlaceholder")}
              value={fullName}
              onChangeText={(v) => {
                setFullName(v);
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              error={errors.name}
              autoCapitalize="words"
            />
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
              label={t("createAccount.phoneLabel")}
              icon="call-outline"
              placeholder={t("createAccount.phonePlaceholder")}
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
              }}
              error={errors.phone}
              keyboardType="phone-pad"
              autoComplete="tel"
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

            {/* Success note (valid form, no backend yet) */}
            {submitted && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 16,
                  backgroundColor: mode === "dark" ? "#16261B" : "#E8F6EE",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#1E9E5A" />
                <Text style={{ flex: 1, color: mode === "dark" ? "#9BE3BA" : "#1B7A45", fontSize: 13 }}>
                  {t("createAccount.success")}
                </Text>
              </View>
            )}

            {/* PRIMARY — brand gradient */}
            <Pressable onPress={onSubmit} style={({ pressed }) => ({ marginTop: 20, opacity: pressed ? 0.9 : 1 })}>
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
                <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
                  {t("createAccount.submit")}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: colors.textSecondary,
                }}
              >
                {t("createAccount.or")}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            {/* Social — stubs */}
            <View style={{ gap: 12 }}>
              <SocialButton
                colors={colors}
                icon="logo-google"
                label={t("createAccount.google")}
                onPress={() => {
                  // TODO: Google OAuth via Supabase.
                }}
              />
              <SocialButton
                colors={colors}
                icon="logo-apple"
                label={t("createAccount.apple")}
                onPress={() => {
                  // TODO: Apple sign-in via Supabase.
                }}
              />
            </View>

            {/* Footer — already have an account */}
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                {t("createAccount.haveAccount")}{" "}
              </Text>
              <Pressable
                onPress={goBack}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: brand.violet, fontSize: 15, fontWeight: "700" }}>
                  {t("createAccount.login")}
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
          fontSize: 12,
          fontWeight: "700",
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
        <Text style={{ color: "#BA1A1A", fontSize: 12, marginTop: 6, marginLeft: 4 }}>{error}</Text>
      )}
    </View>
  );
}

function SocialButton({
  colors,
  icon,
  label,
  onPress,
}: {
  colors: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: 15,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
