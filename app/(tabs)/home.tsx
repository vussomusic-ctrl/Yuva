import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { PropertyCard } from "../../components/PropertyCard";
import { recommendedListings, newListings } from "../../lib/mock/listings";

const LANGS = ["az", "ru", "en"] as const;

const DEALS = [
  { key: "sale", label: "home.dealSale" },
  { key: "rent", label: "home.dealRent" },
  { key: "sell", label: "home.dealSell" },
] as const;

const CATEGORIES = [
  { key: "apartments", label: "home.catApartments", icon: "business-outline" },
  { key: "houses", label: "home.catHouses", icon: "home-outline" },
  { key: "land", label: "home.catLand", icon: "map-outline" },
  { key: "objects", label: "home.catObjects", icon: "storefront-outline" },
] as const;

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [deal, setDeal] = useState<"sale" | "rent" | "sell">("sale");
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string) =>
    setFavorites((f) => ({ ...f, [id]: !f[id] }));

  const cycleLanguage = () => {
    const idx = LANGS.indexOf((i18n.language as (typeof LANGS)[number]) ?? "az");
    i18n.changeLanguage(LANGS[(idx + 1) % LANGS.length]);
  };

  const openListing = (id: string) => router.push(`/property/${id}`);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Header — Home is allowed the brand logo (transparent PNG, no plate) */}
      <View
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
        }}
      >
        <Pressable hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name="menu" size={26} color={colors.text} />
        </Pressable>
        <Image
          source={require("../../assets/yuva-logo.png")}
          resizeMode="contain"
          style={{ width: 92, height: 30 }}
        />
        <Pressable
          onPress={cycleLanguage}
          hitSlop={10}
          style={({ pressed }) => ({
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: brand.violet, fontWeight: "800", fontSize: 12, letterSpacing: 1 }}>
            {i18n.language.toUpperCase().slice(0, 2)}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, gap: 24 }}
      >
        {/* Location + Search */}
        <View style={{ paddingHorizontal: 16, gap: 8, marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="location" size={16} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{t("home.location")}</Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              height: 48,
              borderRadius: 24,
              paddingHorizontal: 16,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("home.searchPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={{ flex: 1, marginHorizontal: 8, color: colors.text, fontSize: 14 }}
            />
            <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginRight: 10 }} />
            <Pressable hitSlop={8}>
              <Ionicons name="options-outline" size={22} color={brand.violet} />
            </Pressable>
          </View>
        </View>

        {/* Deal-type chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {DEALS.map((d) => {
            const active = deal === d.key;
            return (
              <Pressable
                key={d.key}
                onPress={() => setDeal(d.key)}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 9,
                  borderRadius: 999,
                  backgroundColor: active ? brand.violet : colors.card,
                  borderWidth: 1,
                  borderColor: active ? brand.violet : colors.border,
                }}
              >
                <Text
                  style={{
                    color: active ? "#FFFFFF" : colors.text,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {t(d.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Categories */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 }}>
          {CATEGORIES.map((c) => (
            <Category key={c.key} icon={c.icon} label={t(c.label)} colors={colors} />
          ))}
        </View>

        {/* Recommended carousel */}
        <View style={{ gap: 12 }}>
          <SectionHeader
            title={t("home.recommended")}
            action={t("home.seeAll")}
            colors={colors}
            onAction={() => router.push("/search")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
          >
            {recommendedListings.map((l) => (
              <PropertyCard
                key={l.id}
                listing={l}
                variant="carousel"
                favorited={!!favorites[l.id]}
                onToggleFavorite={() => toggleFavorite(l.id)}
                onPress={() => openListing(l.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* New listings feed */}
        <View style={{ gap: 16, paddingHorizontal: 16 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
            {t("home.newListings")}
          </Text>
          {newListings.map((l) => (
            <PropertyCard
              key={l.id}
              listing={l}
              variant="feed"
              favorited={!!favorites[l.id]}
              onToggleFavorite={() => toggleFavorite(l.id)}
              onPress={() => openListing(l.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({
  title,
  action,
  onAction,
  colors,
}: {
  title: string;
  action: string;
  onAction: () => void;
  colors: Theme;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        paddingHorizontal: 16,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{title}</Text>
      <Pressable onPress={onAction} hitSlop={8}>
        <Text style={{ color: brand.violet, fontSize: 13, fontWeight: "700" }}>{action}</Text>
      </Pressable>
    </View>
  );
}

function Category({
  icon,
  label,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: Theme;
}) {
  return (
    <Pressable style={({ pressed }) => ({ alignItems: "center", gap: 8, opacity: pressed ? 0.6 : 1 })}>
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={26} color={brand.violet} />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
