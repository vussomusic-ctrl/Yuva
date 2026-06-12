import { useCallback, useState } from "react";
import { View, Text, Pressable, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { PropertyCard } from "../components/PropertyCard";
import { LoadingState, ErrorState } from "../components/ListState";
import { EmptyState } from "../components/EmptyState";
import { useFavorites } from "../lib/favorites";
import { useAuth } from "../lib/auth";
import { Listing } from "../lib/mock/listings";
import { fetchMyListings, deleteListing } from "../lib/api/listings";

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const { user } = useAuth();

  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);

  // Refetch every time the screen gains focus — this is what makes a freshly
  // published listing appear (the DB doesn't unshift into an in-memory array).
  const load = useCallback(() => {
    if (!user) {
      setItems([]);
      return;
    }
    setError(false);
    fetchMyListings(user.id)
      .then(setItems)
      .catch(() => setError(true));
  }, [user]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = items === null && !error;

  // Optimistic delete: drop the row immediately, restore it at its original
  // index if the DB call fails. FK cascade removes its photos + favorites.
  const doDelete = async (item: Listing) => {
    const snapshot = items ?? [];
    const index = snapshot.findIndex((l) => l.id === item.id);
    setItems(snapshot.filter((l) => l.id !== item.id));

    const { ok } = await deleteListing(item.id, item.ownerId);
    if (!ok) {
      setItems((cur) => {
        const arr = [...(cur ?? [])];
        arr.splice(index < 0 ? arr.length : index, 0, item);
        return arr;
      });
      Alert.alert(t("myListings.errDelete"));
    }
  };

  const confirmDelete = (item: Listing) => {
    Alert.alert(t("myListings.deleteConfirmTitle"), t("myListings.deleteConfirmMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("myListings.delete"), style: "destructive", onPress: () => doDelete(item) },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header
        colors={colors}
        title={t("myListings.title")}
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
              image={require("../assets/icons/empty/house-keys-bonus.png")}
              title={t("myListings.emptyTitle")}
              subtitle={t("myListings.emptyDesc")}
            />
          }
          renderItem={({ item }) => (
            <View>
              <PropertyCard
                listing={item}
                variant="feed"
                favorited={isFavorite(item.id)}
                onToggleFavorite={() => toggle(item.id)}
                onPress={() => router.push(`/property/${item.id}`)}
              />
              {/* Owner action strip */}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <Pressable
                  onPress={() => router.push(`/add-listing?id=${item.id}`)}
                  hitSlop={6}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Ionicons name="create-outline" size={18} color={brand.violet} />
                  <Text style={{ color: brand.violet, fontSize: 14, fontWeight: "600" }}>
                    {t("myListings.edit")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(item)}
                  hitSlop={6}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: 14, fontWeight: "600" }}>
                    {t("myListings.delete")}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

export function Header({ colors, title, onBack }: { colors: Theme; title: string; onBack: () => void }) {
  return (
    <View style={{ height: 56, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
      <Pressable onPress={onBack} hitSlop={10} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{title}</Text>
    </View>
  );
}

