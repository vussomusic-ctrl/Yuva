import { useCallback, useEffect, useState } from "react";
import { View, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { PropertyCard } from "../components/PropertyCard";
import { LoadingState, ErrorState } from "../components/ListState";
import { useFavorites } from "../lib/favorites";
import { Listing } from "../lib/mock/listings";
import { fetchListingsByIds } from "../lib/api/listings";
import { Header, EmptyState } from "./my-listings";

export default function SavedScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { ids, isFavorite, toggle } = useFavorites();

  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);

  // Re-resolve whenever the saved-id set changes (shared favorites state).
  const load = useCallback(() => {
    setError(false);
    fetchListingsByIds(ids)
      .then((list) => {
        // Keep the saved order (most-recently toggled first as in `ids`).
        const byId = new Map(list.map((l) => [l.id, l]));
        setItems(ids.map((id) => byId.get(id)).filter((l): l is Listing => l != null));
      })
      .catch(() => setError(true));
  }, [ids]);
  useEffect(() => { load(); }, [load]);

  const loading = items === null && !error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header
        colors={colors}
        title={t("saved.title")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
      />

      {loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <FlatList
          data={items ?? []}
          keyExtractor={(l) => l.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListEmptyComponent={
            <EmptyState
              colors={colors}
              icon="heart-outline"
              title={t("saved.emptyTitle")}
              desc={t("saved.emptyDesc")}
            />
          }
          renderItem={({ item }) => (
            <PropertyCard
              listing={item}
              variant="feed"
              favorited={isFavorite(item.id)}
              onToggleFavorite={() => toggle(item.id)}
              onPress={() => router.push(`/property/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
