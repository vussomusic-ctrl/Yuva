import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, Switch } from "react-native";
import Animated, { useAnimatedScrollHandler, withSpring } from "react-native-reanimated";
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
import { fetchMyListings } from "../../lib/api/listings";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors, mode, toggleTheme } = useTheme();
  const router = useRouter();
  const { current, currentName, languages, setLanguage } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const { session, profile, signOut } = useAuth();
  const { scrollY } = useScrollCtx();
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Active-listings count — feeds the "My listings" card subtitle.
  const [listingStats, setListingStats] = useState<{ active: number } | null>(null);
  const uid = session?.user?.id ?? null;

  useFocusEffect(
    useCallback(() => {
      scrollY.value = withSpring(0, { damping: 18, stiffness: 120 });
      if (!uid) {
        setListingStats(null);
        return;
      }
      fetchMyListings(uid)
        .then((ls) => setListingStats({ active: ls.filter((l) => l.status === "active").length }))
        .catch(() => {});
      return () => {};
    }, [uid, scrollY]),
  );

  const loggedIn = !!session;
  const displayName = profile?.full_name || session?.user?.email || t("profile.guest");
  const roleLabel = profile?.role === "agent" ? t("profile.roleAgent") : t("profile.roleUser");
  const avatarUrl = profile?.avatar_url ?? null;
  const tintViolet = mode === "dark" ? "#241B33" : "#F0E9FB";

  const onLogout = async () => {
    await signOut();
    router.replace("/welcome");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* 1. Header — title + notifications bell + mail-bird mascot */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 2 }}>
        <Text style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 28 }}>{t("profile.title")}</Text>
        <Image source={require("../../assets/icons/deals/bird-wave.png")} style={{ width: 68, height: 68 }} resizeMode="contain" />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
      >
        {/* 2. Profile card */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 4,
            backgroundColor: tintViolet,
            borderRadius: 24,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            shadowColor: brand.violet,
            shadowOpacity: 0.12,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Pressable onPress={() => router.push("/edit-profile")}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.card }} />
            ) : (
              <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="person" size={38} color="#FFFFFF" />
              </View>
            )}
            <LinearGradient
              colors={brand.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: tintViolet,
              }}
            >
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.bold, fontSize: 22 }}>
              {displayName}
            </Text>
            {loggedIn && profile?.verified && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  alignSelf: "flex-start",
                  backgroundColor: brand.violet + "22",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                }}
              >
                <Ionicons name="checkmark-circle" size={14} color={brand.violet} />
                <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 12 }}>{t("profile.verifiedAgent")}</Text>
              </View>
            )}
            {loggedIn && (
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>{roleLabel}</Text>
            )}
          </View>
        </View>

        {/* 4. My listings — featured card */}
        {loggedIn && (
          <Pressable onPress={() => router.push("/my-listings")} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 16,
                backgroundColor: tintViolet,
                borderRadius: 20,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Image source={require("../../assets/icons/clay/building.png")} style={{ width: 44, height: 44 }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 16 }}>{t("profile.myListings")}</Text>
                <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13, marginTop: 2 }}>
                  {listingStats ? t("profile.nActive", { n: listingStats.active }) : "—"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={brand.violet} />
            </View>
          </Pressable>
        )}

        {/* 5. Primary menu */}
        {loggedIn && (
          <Card colors={colors}>
            <MenuRow colors={colors} ionicon="heart" color={brand.magenta} label={t("profile.saved")} onPress={() => router.push("/saved")} />
            <MenuRow colors={colors} ionicon="business" color={brand.violet} label={t("profile.agenciesPartners")} onPress={() => router.push("/agencies")} isLast />
          </Card>
        )}

        {/* 6. Secondary */}
        <Card colors={colors}>
          <MenuRow colors={colors} ionicon="settings-sharp" color={brand.violet} label={t("profile.settings")} onPress={() => router.push("/settings")} />
          <MenuRow
            colors={colors}
            ionicon="language"
            color={brand.blue}
            label={t("profile.language")}
            onPress={() => setLangOpen(true)}
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: font.semibold, fontSize: 14 }}>{currentName}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            }
          />
          <MenuRow
            colors={colors}
            ionicon={mode === "dark" ? "moon" : "sunny"}
            color={brand.orange}
            label={t("profile.theme")}
            isLast
            right={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>
                  {t(mode === "dark" ? "profile.themeDark" : "profile.themeLight")}
                </Text>
                <Switch
                  value={mode === "dark"}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: brand.violet }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                />
              </View>
            }
          />
        </Card>

        {/* 7. Log out / Log in */}
        <Card colors={colors}>
          {loggedIn ? (
            <Pressable
              onPress={onLogout}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.danger + "22", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              </View>
              <Text style={{ color: colors.danger, fontFamily: font.semibold, fontSize: 16 }}>{t("profile.logout")}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.replace("/login")}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: brand.violet + "22", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="log-in-outline" size={20} color={brand.violet} />
              </View>
              <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 16 }}>{t("profile.login")}</Text>
            </Pressable>
          )}
        </Card>
      </Animated.ScrollView>

      {/* Language picker */}
      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)}>
        <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 17, textAlign: "center", paddingTop: 6, paddingBottom: 8 }}>
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
              <Text style={{ color: active ? brand.violet : colors.text, fontFamily: active ? font.bold : font.medium, fontSize: 16 }}>
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

function Card({ colors, children }: { colors: Theme; children: React.ReactNode }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 16,
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

function MenuRow({
  colors,
  ionicon,
  color,
  label,
  badge,
  right,
  onPress,
  isLast,
}: {
  colors: Theme;
  ionicon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  badge?: number;
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
        padding: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
        opacity: pressed && onPress ? 0.6 : 1,
      })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={ionicon} size={20} color={color} />
      </View>
      <Text style={{ flex: 1, color: colors.text, fontFamily: font.medium, fontSize: 16 }}>{label}</Text>
      {badge != null && badge > 0 && (
        <LinearGradient
          colors={brand.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", marginRight: 4 }}
        >
          <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 11 }}>{badge}</Text>
        </LinearGradient>
      )}
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </Pressable>
  );
}
