import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { SearchBar } from "../../components/SearchBar";
import { DealTypeChips } from "../../components/DealTypeChips";
import { SegmentedControl } from "../../components/SegmentedControl";
import { PropertyCard } from "../../components/PropertyCard";
import { SearchMap } from "../../components/SearchMap";
import { BottomSheet } from "../../components/BottomSheet";
import { LoadingState, ErrorState } from "../../components/ListState";
import { useFavorites } from "../../lib/favorites";
import { useFilters, filterListings } from "../../lib/filters-state";
import { Listing, isPromoActive } from "../../lib/mock/listings";
import { fetchFeed } from "../../lib/api/listings";
import { buildListingTitle } from "../../lib/listingTitle";
import { useLanguage } from "../../lib/i18n/languages";

type SortKey = "default" | "priceAsc" | "priceDesc" | "newest";

const SORTS: { key: SortKey; labelKey: string }[] = [
  { key: "default", labelKey: "search.sortDefault" },
  { key: "priceAsc", labelKey: "search.sortPriceAsc" },
  { key: "priceDesc", labelKey: "search.sortPriceDesc" },
  { key: "newest", labelKey: "search.sortNewest" },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [sort, setSort] = useState<SortKey>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { filters, setDealType, activeCount } = useFilters();

  // Feed from Supabase (same active set as Home), refetched on focus.
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

  // Stable per-load rotation for the Premium/VIP bands so paid listings share
  // exposure (random order) without jumping on every re-render. Reshuffles only
  // when the feed itself reloads.
  const rotation = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of feed ?? []) m[l.id] = Math.random();
    return m;
  }, [feed]);

  const results = useMemo(() => {
    // Active filters first (incl. deal type), then the free-text query on top.
    const base = filterListings(feed ?? [], filters);
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? base
      : base.filter(
          (l) =>
            buildListingTitle(l, t, lang).toLowerCase().includes(q) ||
            l.district.toLowerCase().includes(q),
        );

    // Promotion bands first (Premium > VIP > normal) — paid listings stay on top
    // even under price sort (bina.az behavior). Within a band, the user's sort
    // applies; for default/newest the paid bands rotate and the normal band
    // floats bumped listings up via max(createdAt, lastBumpedAt).
    const band = (l: Listing) => (isPromoActive(l) ? (l.promoTier === "premium" ? 0 : 1) : 2);
    const freshness = (l: Listing) =>
      Math.max(new Date(l.createdAt).getTime(), l.lastBumpedAt ? new Date(l.lastBumpedAt).getTime() : 0);

    const arr = [...filtered];
    arr.sort((a, b) => {
      const ba = band(a);
      const bb = band(b);
      if (ba !== bb) return ba - bb; // band is the primary key, always
      if (sort === "priceAsc") return a.priceAzn - b.priceAzn;
      if (sort === "priceDesc") return b.priceAzn - a.priceAzn;
      // default / newest:
      if (ba < 2) return (rotation[a.id] ?? 0) - (rotation[b.id] ?? 0); // paid bands rotate
      return freshness(b) - freshness(a); // normal band: newest, bumped floats up
    });
    return arr;
  }, [feed, query, filters, sort, t, lang, rotation]);

  const sortLabel = t(SORTS.find((s) => s.key === sort)!.labelKey);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: search + filters (no logo) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          onPressFilter={() => router.push("/filters")}
          filterBadge={activeCount}
        />
        <SegmentedControl
          items={[
            { key: "list", labelKey: "search.viewList" },
            { key: "map", labelKey: "search.viewMap" },
          ]}
          value={view}
          onChange={(k) => setView(k as "list" | "map")}
        />
      </View>

      <DealTypeChips value={filters.dealType} onChange={setDealType} />

      {/* Sort control (view-only, applies on top of filters) */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingTop: 12 }}>
        <Pressable
          onPress={() => setSortOpen(true)}
          hitSlop={8}
          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 6, opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="swap-vertical-outline" size={18} color={brand.violet} />
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
            {t("search.sort")}: <Text style={{ color: brand.violet }}>{sortLabel}</Text>
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : view === "map" ? (
        <SearchMap listings={results} onOpen={(id) => router.push(`/property/${id}`)} />
      ) : (
        <FlatList
          style={{ flex: 1, marginTop: 12 }}
          data={results}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 96, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            results.length > 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: "600", marginBottom: 16 }}>
                {t("search.resultsCount", { count: results.length })}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Placeholder
              colors={colors}
              icon="search-outline"
              title={t("search.emptyTitle")}
              desc={t("search.emptyDesc")}
            />
          }
          renderItem={({ item }) => (
            <PropertyCard
              listing={item}
              variant="feed"
              favorited={isFavorite(item.id)}
              onToggleFavorite={() => toggleFavorite(item.id)}
              onPress={() => router.push(`/property/${item.id}`)}
            />
          )}
        />
      )}

      {/* Sort picker */}
      <BottomSheet visible={sortOpen} onClose={() => setSortOpen(false)}>
        <Text
          style={{ color: colors.text, fontSize: 17, fontWeight: "700", textAlign: "center", paddingTop: 6, paddingBottom: 8 }}
        >
          {t("search.sort")}
        </Text>
        {SORTS.map((s, i) => {
          const active = s.key === sort;
          return (
            <Pressable
              key={s.key}
              onPress={() => {
                setSort(s.key);
                setSortOpen(false);
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
              <Text style={{ color: active ? brand.violet : colors.text, fontSize: 16, fontWeight: active ? "700" : "500" }}>
                {t(s.labelKey)}
              </Text>
              {active && <Ionicons name="checkmark-circle" size={22} color={brand.violet} />}
            </Pressable>
          );
        })}
      </BottomSheet>
    </SafeAreaView>
  );
}

function Placeholder({
  colors,
  icon,
  title,
  desc,
}: {
  colors: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
      <Ionicons name={icon} size={48} color={colors.textSecondary} />
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>{desc}</Text>
    </View>
  );
}
