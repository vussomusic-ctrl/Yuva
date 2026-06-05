import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { useLanguage } from "../../lib/i18n/languages";
import { BottomSheet } from "../../components/BottomSheet";
import { currentUser } from "../../lib/mock/user";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors, mode, toggleTheme } = useTheme();
  const router = useRouter();
  const { current, currentName, languages, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);

  const roleLabel = currentUser.role === "agent" ? t("profile.roleAgent") : t("profile.roleUser");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Contextual header: avatar (with upload affordance) + name + role. No logo. */}
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 8, gap: 10 }}>
          <Pressable onPress={() => { /* TODO: image picker upload */ }}>
            <Image
              source={{ uri: currentUser.avatar }}
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: colors.card,
                borderWidth: 3,
                borderColor: colors.card,
              }}
            />
            <LinearGradient
              colors={brand.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: colors.bg,
              }}
            >
              <Ionicons name="camera" size={15} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
              {currentUser.name}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{roleLabel}</Text>
          </View>
        </View>

        {/* Settings card */}
        <View
          style={{
            marginTop: 16,
            marginHorizontal: 16,
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <Row
            colors={colors}
            icon="pricetags-outline"
            label={t("profile.myListings")}
            onPress={() => router.push("/my-listings")}
          />
          <Row
            colors={colors}
            icon="heart-outline"
            label={t("profile.saved")}
            onPress={() => router.push("/saved")}
          />
          <Row
            colors={colors}
            icon="language-outline"
            label={t("profile.language")}
            onPress={() => setLangOpen(true)}
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "600" }}>
                  {currentName}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            }
          />
          <Row
            colors={colors}
            icon="settings-outline"
            label={t("profile.settings")}
            onPress={() => { /* TODO: settings */ }}
          />
          <Row
            colors={colors}
            icon={mode === "dark" ? "moon-outline" : "sunny-outline"}
            label={t("profile.theme")}
            isLast
            right={
              <Switch
                value={mode === "dark"}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: brand.violet }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.border}
              />
            }
          />
        </View>

        {/* Log out — tertiary/destructive, never the primary gradient */}
        <View
          style={{
            marginTop: 16,
            marginHorizontal: 16,
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <Pressable
            onPress={() => router.replace("/welcome")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 16,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: 16, fontWeight: "600" }}>
              {t("profile.logout")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Language picker */}
      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)}>
        <Text
          style={{
            color: colors.text,
            fontSize: 17,
            fontWeight: "700",
            textAlign: "center",
            paddingTop: 6,
            paddingBottom: 8,
          }}
        >
          {t("profile.language")}
        </Text>
        {languages.map((l, i) => {
          const active = l.code === current;
          return (
            <Pressable
              key={l.code}
              onPress={() => {
                setLanguage(l.code);
                setLangOpen(false);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderTopWidth: i === 0 ? 1 : 0,
                borderBottomWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  color: active ? brand.violet : colors.text,
                  fontSize: 16,
                  fontWeight: active ? "700" : "500",
                }}
              >
                {l.name}
              </Text>
              {active && <Ionicons name="checkmark-circle" size={22} color={brand.violet} />}
            </Pressable>
          );
        })}
      </BottomSheet>
    </SafeAreaView>
  );
}

function Row({
  colors,
  icon,
  label,
  right,
  onPress,
  isLast,
}: {
  colors: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  right?: React.ReactNode;
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
        padding: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
        opacity: pressed && onPress ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={brand.violet} />
      <Text style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "500" }}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </Pressable>
  );
}
