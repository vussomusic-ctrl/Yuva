import { View, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { PropertyCard } from "../components/PropertyCard";
import { useFavorites } from "../lib/favorites";
import { getListingById, Listing } from "../lib/mock/listings";
import { Header, EmptyState } from "./my-listings";

export default function SavedScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { ids, isFavorite, toggle } = useFavorites();

  // Reactively reflects every heart toggled anywhere in the app (shared state).
  const saved = ids
    .map(getListingById)
    .filter((l): l is Listing => l != null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header
        colors={colors}
        title={t("saved.title")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
      />

      <FlatList
        data={saved}
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
    </SafeAreaView>
  );
}
