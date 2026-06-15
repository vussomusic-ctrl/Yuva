import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, Switch } from "react-native";
import Animated, { useAnimatedScrollHandler } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useScrollCtx } from "../../lib/scrollContext";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { font } from "../../lib/theme/typography";
import { useLanguage } from "../../lib/i18n/languages";
import { BottomSheet } from "../../components/BottomSheet";
import { useAuth } from "../../lib/auth";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, mode, toggleTheme } = useTheme();
  const router = useRouter();
  const { current, currentName, languages, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const { session, profile, signOut } = useAuth();
  const { scrollY } = useScrollCtx();
  const scrollHandler = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  useFocusEffect(useCallback(() => { scrollY.value = 0; return () => {}; }, [scrollY]));

  const loggedIn = !!session;
  const displayName = profile?.full_name || session?.user?.email || t("profile.guest");
  const roleLabel = profile?.role === "agent" ? t("profile.roleAgent") : t("profile.roleUser");
  const avatarUrl = profile?.avatar_url ?? null;

  const onLogout = async () => {
    await signOut();
    router.replace("/welcome");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <Animated.ScrollView showsVerticalScrollIndicator={false} onScroll={scrollHandler} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        {/* Contextual header: avatar (with upload affordance) + name + role. No logo. */}
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 8, gap: 10 }}>
          <Pressable onPress={() => router.push("/edit-profile")}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: colors.card,
                  borderWidth: 3,
                  borderColor: colors.card,
                }}
              />
            ) : (
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: brand.violet,
                  borderWidth: 3,
                  borderColor: colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="person" size={46} color="#FFFFFF" />
              </View>
            )}
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
            <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 20 }}>
              {displayName}
            </Text>
            {loggedIn && (
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>{roleLabel}</Text>
            )}
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
                <Text style={{ color: colors.textSecondary, fontFamily: font.semibold, fontSize: 14 }}>
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
            onPress={() => router.push("/settings")}
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
          {loggedIn ? (
            <Pressable
              onPress={onLogout}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 16,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              <Text style={{ color: colors.danger, fontFamily: font.semibold, fontSize: 16 }}>
                {t("profile.logout")}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.replace("/login")}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 16,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="log-in-outline" size={22} color={brand.violet} />
              <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 16 }}>
                {t("profile.login")}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.ScrollView>

      {/* Language picker */}
      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)}>
        <Text
          style={{
            color: colors.text,
            fontFamily: font.bold,
            fontSize: 17,
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
                  fontFamily: active ? font.bold : font.medium,
                  fontSize: 16,
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
      <Text style={{ flex: 1, color: colors.text, fontFamily: font.medium, fontSize: 16 }}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </Pressable>
  );
}
