import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
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

  // Cache of listing objects fetched on focus. The visible list is the live
  // intersection of this cache with the CURRENT favorites set (below), so an
  // unlike here hides the card instantly — no network round-trip per toggle.
  const [loaded, setLoaded] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);

  // Read ids by snapshot at focus time → the fetch callback stays stable and
  // doesn't re-run on every like/unlike.
  const idsRef = useRef(ids);
  useEffect(() => { idsRef.current = ids; }, [ids]);

  const load = useCallback(() => {
    setError(false);
    fetchListingsByIds(idsRef.current)
      .then(setLoaded)
      .catch(() => setError(true));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Live: reacts to `ids` (instant unlike) and to `loaded` (focus refetch).
  // Preserves the saved order from `ids`.
  const visible = useMemo(() => {
    const byId = new Map((loaded ?? []).map((l) => [l.id, l]));
    return ids.map((id) => byId.get(id)).filter((l): l is Listing => l != null);
  }, [loaded, ids]);

  const loading = loaded === null && !error;

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
          data={visible}
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
