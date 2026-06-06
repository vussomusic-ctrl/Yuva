import { useState } from "react";
import { View, Text, Pressable, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { Header } from "./my-listings";

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  // Notification preferences — local only for now (Supabase later).
  const [newMatches, setNewMatches] = useState(true);
  const [priceDrop, setPriceDrop] = useState(true);
  const [messages, setMessages] = useState(true);

  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header
        colors={colors}
        title={t("settings.title")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Notifications */}
        <SectionLabel colors={colors} text={t("settings.notifications")} />
        <Card colors={colors}>
          <ToggleRow colors={colors} label={t("settings.notifNewMatches")} value={newMatches} onValueChange={setNewMatches} />
          <ToggleRow colors={colors} label={t("settings.notifPriceDrop")} value={priceDrop} onValueChange={setPriceDrop} />
          <ToggleRow colors={colors} label={t("settings.notifMessages")} value={messages} onValueChange={setMessages} isLast />
        </Card>

        {/* Account */}
        <SectionLabel colors={colors} text={t("settings.account")} />
        <Card colors={colors}>
          <LinkRow colors={colors} icon="person-outline" label={t("settings.editProfile")} />
          <LinkRow colors={colors} icon="call-outline" label={t("settings.editContact")} />
          <LinkRow colors={colors} icon="trash-outline" label={t("settings.deleteAccount")} danger isLast />
        </Card>

        {/* About */}
        <SectionLabel colors={colors} text={t("settings.about")} />
        <Card colors={colors}>
          <LinkRow
            colors={colors}
            icon="information-circle-outline"
            label={t("settings.version")}
            right={<Text style={{ color: colors.textSecondary, fontSize: 14 }}>{version}</Text>}
          />
          <LinkRow colors={colors} icon="document-text-outline" label={t("settings.terms")} />
          <LinkRow colors={colors} icon="shield-checkmark-outline" label={t("settings.privacy")} />
          <LinkRow colors={colors} icon="help-buoy-outline" label={t("settings.support")} isLast />
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
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        marginTop: 20,
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
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function ToggleRow({
  colors,
  label,
  value,
  onValueChange,
  isLast,
}: {
  colors: Theme;
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
        justifyContent: "space-between",
        padding: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "500" }}>{label}</Text>
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

function LinkRow({
  colors,
  icon,
  label,
  right,
  danger,
  isLast,
  onPress,
}: {
  colors: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  right?: React.ReactNode;
  danger?: boolean;
  isLast?: boolean;
  onPress?: () => void;
}) {
  const tint = danger ? colors.danger : brand.violet;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
        opacity: pressed && onPress ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={tint} />
      <Text style={{ flex: 1, color: danger ? colors.danger : colors.text, fontSize: 16, fontWeight: "500" }}>
        {label}
      </Text>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </Pressable>
  );
}
