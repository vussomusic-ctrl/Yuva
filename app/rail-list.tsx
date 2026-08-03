import { useCallback, useState } from "react";
import { View, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { PropertyCardCompact } from "../components/PropertyCardCompact";
import { LoadingState, ErrorState } from "../components/ListState";
import { EmptyState } from "../components/EmptyState";
import { useFavorites } from "../lib/favorites";
import { Listing } from "../lib/mock/listings";
import { fetchFeed, fetchListingsByIds } from "../lib/api/listings";
import { getViewedIds } from "../lib/recentlyViewed";
import { Header } from "./my-listings";

// Vertical list behind a home rail's "Все" link. kind=new → the full feed (already
// sorted newest-first); kind=recent → viewing history in its stored (most-recent)
// order. Header + 2-column grid of PropertyCardCompact (same card as home rails).
export default function RailListScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const { kind } = useLocalSearchParams<{ kind?: "new" | "recent" }>();
  const isRecent = kind === "recent";

  const [data, setData] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      if (isRecent) {
        // Viewing history → listings, reordered to the stored (most-recent) order.
        const ids = await getViewedIds();
        if (ids.length === 0) {
          setData([]);
          return;
        }
        const fetched = await fetchListingsByIds(ids);
        const ordered = ids.map((id) => fetched.find((l) => l.id === id)).filter((l): l is Listing => !!l);
        setData(ordered);
      } else {
        setData(await fetchFeed());
      }
    } catch {
      setError(true);
    }
  }, [isRecent]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = data === null && !error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header
        colors={colors}
        title={isRecent ? t("home.recentlyViewed") : t("home.newListings")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
      />

      {loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(l) => l.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, flexGrow: 1 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <EmptyState
              image={require("../assets/icons/empty/empty-home.png")}
              title={isRecent ? t("railList.emptyRecentTitle") : t("home.emptyTitle")}
              subtitle={isRecent ? t("railList.emptyRecentDesc") : t("home.emptyDesc")}
            />
          }
          renderItem={({ item }) => (
            // flex:1 fills the column; maxWidth caps a lone odd item to ~half so
            // it doesn't stretch across the full row.
            <View style={{ flex: 1, maxWidth: "48.5%" }}>
              <PropertyCardCompact
                listing={item}
                favorited={isFavorite(item.id)}
                onToggleFavorite={() => toggle(item.id)}
                onPress={() => router.push(`/property/${item.id}`)}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
