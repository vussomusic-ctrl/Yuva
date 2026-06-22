import { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { Theme } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { Header } from "./my-listings";
import { PrimaryButton, SecondaryButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useAuth, authErrorKey } from "../lib/auth";

export default function SecurityScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { user, session, verifyPassword, changePassword, sendPasswordReset, signOutEverywhere } = useAuth();

  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false); // one toggle for all 3 fields

  const onBack = () => (router.canGoBack() ? router.back() : router.replace("/settings"));

  // Guest guard — same clay EmptyState pattern as edit-profile (no redirect).
  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <Header colors={colors} title={t("security.title")} onBack={onBack} />
        <EmptyState
          image={require("../assets/auth/bird-lock.png")}
          title={t("editProfile.guestPrompt")}
          cta={{ label: t("profile.login"), onPress: () => router.replace("/login") }}
        />
      </SafeAreaView>
    );
  }

  const email = session?.user?.email ?? "";

  const onChangePw = async () => {
    if (savingPw) return;
    if (!cur) {
      Alert.alert(t("security.wrongCurrentPw"));
      return;
    }
    if (pw.length < 6) {
      Alert.alert(t("security.pwTooShort"));
      return;
    }
    if (pw !== pw2) {
      Alert.alert(t("security.pwMismatch"));
      return;
    }
    setSavingPw(true);
    // Re-auth with the current password before changing it.
    const check = await verifyPassword(cur);
    if (check.error) {
      setSavingPw(false);
      Alert.alert(t("security.wrongCurrentPw"));
      return;
    }
    const { error } = await changePassword(pw);
    setSavingPw(false);
    if (error) {
      Alert.alert(t(authErrorKey(error)));
      return;
    }
    setCur("");
    setPw("");
    setPw2("");
    Alert.alert(t("security.pwChanged"));
  };

  const onSendReset = async () => {
    if (sendingReset) return;
    setSendingReset(true);
    const { error } = await sendPasswordReset();
    setSendingReset(false);
    if (error) {
      Alert.alert(t(authErrorKey(error)));
      return;
    }
    Alert.alert(t("security.resetSent"));
  };

  const onSignOutAll = () => {
    Alert.alert(t("security.signOutAll"), t("security.signOutAllConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("security.signOutAllBtn"),
        style: "destructive",
        onPress: async () => {
          await signOutEverywhere();
          router.replace("/welcome");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <Header colors={colors} title={t("security.title")} onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        {/* Change password — single show/hide toggle for all 3 fields */}
        <Card
          colors={colors}
          title={t("security.changePassword")}
          right={
            <Pressable onPress={() => setShowPasswords((s) => !s)} hitSlop={8}>
              <Ionicons name={showPasswords ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSecondary} />
            </Pressable>
          }
        >
          <SecureField colors={colors} placeholder={t("security.currentPassword")} value={cur} onChangeText={setCur} secure={!showPasswords} />
          <SecureField colors={colors} placeholder={t("security.newPassword")} value={pw} onChangeText={setPw} secure={!showPasswords} />
          <SecureField colors={colors} placeholder={t("security.confirmPassword")} value={pw2} onChangeText={setPw2} secure={!showPasswords} />
          <PrimaryButton label={t("security.changePassword")} onPress={onChangePw} disabled={savingPw} />
        </Card>

        {/* Reset by email */}
        <Card colors={colors} title={t("security.resetTitle")}>
          <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14, lineHeight: 20 }}>
            {t("security.resetHint", { email })}
          </Text>
          <SecondaryButton label={t("security.resetSend")} onPress={onSendReset} disabled={sendingReset} />
        </Card>

        {/* Sign out everywhere */}
        <Card colors={colors} title={t("security.signOutAll")}>
          <Pressable
            onPress={onSignOutAll}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 50,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: colors.danger,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, fontFamily: font.bold, fontSize: 16 }}>{t("security.signOutAll")}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Card({ colors, title, right, children }: { colors: Theme; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 16 }}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function SecureField({
  colors,
  placeholder,
  value,
  onChangeText,
  secure,
}: {
  colors: Theme;
  placeholder: string;
  value: string;
  onChangeText: (s: string) => void;
  secure: boolean;
}) {
  return (
    <View style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: 14, justifyContent: "center" }}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secure}
        autoCapitalize="none"
        style={{ color: colors.text, fontFamily: font.regular, fontSize: 15, padding: 0 }}
      />
    </View>
  );
}
