import { useState } from "react";
import { View, Text, Pressable, ScrollView, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { useAuth } from "../lib/auth";
import { Header } from "./my-listings";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { profile, session } = useAuth();
  const loggedIn = !!session;

  // Notification preferences — local only for now (Supabase later).
  const [newMatches, setNewMatches] = useState(true);
  const [priceDrop, setPriceDrop] = useState(true);
  const [messages, setMessages] = useState(true);

  const version = Constants.expoConfig?.version ?? "1.0.0";
  const comingSoon = () => Alert.alert(t("settings.comingSoon"));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header colors={colors} title={t("settings.title")} onBack={() => (router.canGoBack() ? router.back() : router.replace("/profile"))} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Notifications — logged-in only (visual toggles; persistence later) */}
        {loggedIn && (
          <>
            <SectionLabel colors={colors} text={t("settings.notifications")} />
            <Card colors={colors}>
              <ToggleRow colors={colors} ionicon="notifications" color={brand.violet} label={t("settings.notifNewMatches")} value={newMatches} onValueChange={setNewMatches} />
              <ToggleRow colors={colors} ionicon="trending-down" color={brand.orange} label={t("settings.notifPriceDrop")} value={priceDrop} onValueChange={setPriceDrop} />
              <ToggleRow colors={colors} ionicon="chatbubbles" color={brand.blue} label={t("settings.notifMessages")} value={messages} onValueChange={setMessages} isLast />
            </Card>
          </>
        )}

        {/* Admin — only for admins */}
        {profile?.isAdmin && (
          <>
            <SectionLabel colors={colors} text={t("settings.admin")} />
            <Card colors={colors}>
              <Row colors={colors} ionicon="shield-checkmark" color={brand.violet} label={t("settings.manageAgencies")} onPress={() => router.push("/admin/agencies")} isLast />
            </Card>
          </>
        )}

        {/* Account — logged-in only; guests get a Log in card instead */}
        <SectionLabel colors={colors} text={t("settings.account")} />
        {loggedIn ? (
          <Card colors={colors}>
            <Row colors={colors} ionicon="person" color={brand.violet} label={t("settings.editProfile")} onPress={() => router.push("/edit-profile")} />
            <Row colors={colors} ionicon="call" color={brand.blue} label={t("settings.editContact")} onPress={comingSoon} />
            <Row colors={colors} ionicon="lock-closed" color={brand.magenta} label={t("settings.security")} onPress={comingSoon} />
            <Row colors={colors} ionicon="trash" color={colors.danger} label={t("settings.deleteAccount")} danger onPress={comingSoon} isLast />
          </Card>
        ) : (
          <Card colors={colors}>
            <Row colors={colors} ionicon="log-in" color={brand.violet} label={t("profile.login")} onPress={() => router.replace("/login")} isLast />
          </Card>
        )}

        {/* App / about */}
        <SectionLabel colors={colors} text={t("settings.app")} />
        <Card colors={colors}>
          <Row
            colors={colors}
            ionicon="information-circle"
            color={brand.violet}
            label={t("settings.version")}
            right={<Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>{version}</Text>}
          />
          <Row colors={colors} ionicon="document-text" color={brand.blue} label={t("settings.terms")} />
          <Row colors={colors} ionicon="shield-checkmark" color={brand.violet} label={t("settings.privacy")} />
          <Row colors={colors} ionicon="help-buoy" color={brand.orange} label={t("settings.support")} isLast />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ colors, text }: { colors: Theme; text: string }) {
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontFamily: font.bold,
        fontSize: 12,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        marginTop: 22,
        marginBottom: 8,
        marginHorizontal: 24,
      }}
    >
      {text}
    </Text>
  );
}

function Card({ colors, children }: { colors: Theme; children: React.ReactNode }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        backgroundColor: colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

// Tinted icon circle + label (+ optional subtitle) + right/chevron. Profile style.
function Row({
  colors,
  ionicon,
  color,
  label,
  subtitle,
  right,
  danger,
  onPress,
  isLast,
}: {
  colors: Theme;
  ionicon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  subtitle?: string;
  right?: React.ReactNode;
  danger?: boolean;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
        opacity: pressed && onPress ? 0.6 : 1,
      })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={ionicon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? colors.danger : colors.text, fontFamily: font.medium, fontSize: 16 }}>{label}</Text>
        {subtitle && <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </Pressable>
  );
}

function ToggleRow({
  colors,
  ionicon,
  color,
  label,
  value,
  onValueChange,
  isLast,
}: {
  colors: Theme;
  ionicon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={ionicon} size={20} color={color} />
      </View>
      <Text style={{ flex: 1, color: colors.text, fontFamily: font.medium, fontSize: 16 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: brand.violet }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}
