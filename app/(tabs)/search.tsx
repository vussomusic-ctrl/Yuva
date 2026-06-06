import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { Theme } from "../../lib/theme/colors";
import { SearchBar } from "../../components/SearchBar";
import { DealTypeChips } from "../../components/DealTypeChips";
import { Segmented } from "../../components/Segmented";
import { PropertyCard } from "../../components/PropertyCard";
import { SearchMap } from "../../components/SearchMap";
import { useFavorites } from "../../lib/favorites";
import { useFilters, filterListings } from "../../lib/filters-state";
import { newListings } from "../../lib/mock/listings";

export default function SearchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { filters, setDealType, activeCount } = useFilters();

  const results = useMemo(() => {
    // Active filters first (incl. deal type), then the free-text query on top.
    const base = filterListings(newListings, filters);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (l) => l.title.toLowerCase().includes(q) || l.district.toLowerCase().includes(q),
    );
  }, [query, filters]);

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
        <Segmented
          options={[
            { key: "list", label: t("search.viewList") },
            { key: "map", label: t("search.viewMap") },
          ]}
          value={view}
          onChange={(k) => setView(k as "list" | "map")}
        />
      </View>

      <DealTypeChips value={filters.dealType} onChange={setDealType} />

      {view === "map" ? (
        <SearchMap listings={results} onOpen={(id) => router.push(`/property/${id}`)} />
      ) : (
        <FlatList
          style={{ flex: 1, marginTop: 12 }}
          data={results}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
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
