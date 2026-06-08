import { useCallback, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { PropertyCard } from "../../components/PropertyCard";
import { SearchBar } from "../../components/SearchBar";
import { DealTypeChips, DealKey } from "../../components/DealTypeChips";
import { LoadingState, ErrorState } from "../../components/ListState";
import { useLanguage } from "../../lib/i18n/languages";
import { useFavorites } from "../../lib/favorites";
import { useFilters } from "../../lib/filters-state";
import { PropertyTypeKey } from "../../lib/propertyTypes";
import { Listing } from "../../lib/mock/listings";
import { fetchFeed } from "../../lib/api/listings";
import { hasUnreadNotifications } from "../../lib/mock/notifications";

const CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; type: PropertyTypeKey }[] = [
  { key: "apartments", label: "home.catApartments", icon: "business-outline", type: "apartment" },
  { key: "houses", label: "home.catHouses", icon: "home-outline", type: "house" },
  { key: "land", label: "home.catLand", icon: "map-outline", type: "land" },
  { key: "objects", label: "home.catObjects", icon: "storefront-outline", type: "object" },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { current, cycleLanguage } = useLanguage();

  const [query, setQuery] = useState("");
  const [deal, setDeal] = useState<DealKey>("sale");
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { filters, apply } = useFilters();

  // Feed from Supabase. Refetch whenever Home regains focus (e.g. after publish).
  const [feed, setFeed] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false);
    fetchFeed()
      .then(setFeed)
      .catch(() => setError(true));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = feed === null && !error;
  const recommended = (feed ?? []).filter((l) => l.premium);

  const openListing = (id: string) => router.push(`/property/${id}`);

  // Tap a category → carry the current deal type + chosen property type into the
  // shared filter state, then jump to the Search tab (list + map both filter).
  const openCategory = (type: PropertyTypeKey) => {
    apply({ ...filters, dealType: deal, propertyTypes: [type] });
    router.push("/search");
  };

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
        <Image
          source={require("../../assets/yuva-logo.png")}
          resizeMode="contain"
          style={{ width: 92, height: 30 }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => router.push("/notifications")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("notifications.title")}
            style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            {hasUnreadNotifications && (
              <View
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: brand.magenta,
                  borderWidth: 1.5,
                  borderColor: colors.bg,
                }}
              />
            )}
          </Pressable>
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
              {current.toUpperCase()}
            </Text>
          </Pressable>
        </View>
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
          <SearchBar value={query} onChangeText={setQuery} onPressFilter={() => router.push("/filters")} />
        </View>

        {/* Deal-type chips */}
        <DealTypeChips value={deal} onChange={setDeal} />

        {/* Categories */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16 }}>
          {CATEGORIES.map((c) => (
            <Category key={c.key} icon={c.icon} label={t(c.label)} colors={colors} onPress={() => openCategory(c.type)} />
          ))}
        </View>

        {loading && <View style={{ height: 240 }}><LoadingState colors={colors} /></View>}
        {error && <View style={{ height: 240 }}><ErrorState colors={colors} onRetry={load} /></View>}

        {!loading && !error && (
          <>
            {/* Recommended carousel — only when there are premium listings */}
            {recommended.length > 0 && (
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
                  {recommended.map((l) => (
                    <PropertyCard
                      key={l.id}
                      listing={l}
                      variant="carousel"
                      favorited={isFavorite(l.id)}
                      onToggleFavorite={() => toggleFavorite(l.id)}
                      onPress={() => openListing(l.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* New listings feed */}
            <View style={{ gap: 16, paddingHorizontal: 16 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                {t("home.newListings")}
              </Text>
              {(feed ?? []).length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
                  <Ionicons name="home-outline" size={44} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
                    {t("myListings.emptyDesc")}
                  </Text>
                </View>
              ) : (
                (feed ?? []).map((l) => (
                  <PropertyCard
                    key={l.id}
                    listing={l}
                    variant="feed"
                    favorited={isFavorite(l.id)}
                    onToggleFavorite={() => toggleFavorite(l.id)}
                    onPress={() => openListing(l.id)}
                  />
                ))
              )}
            </View>
          </>
        )}
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
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  colors: Theme;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ alignItems: "center", gap: 8, opacity: pressed ? 0.6 : 1 })}>
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
