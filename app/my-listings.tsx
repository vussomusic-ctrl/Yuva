import { useCallback, useState } from "react";
import { View, Text, Pressable, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
import { useLanguage } from "../lib/i18n/languages";
import { pluralSuffix } from "../lib/i18n/plural";
import { Listing } from "../lib/mock/listings";
import { fetchMyListings, deleteListing } from "../lib/api/listings";
import { bumpListing } from "../lib/api/promo";

// #RRGGBB → rgba with the given alpha (for soft icon-button tints).
function tint(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export default function MyListingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const { user } = useAuth();
  const { current: lang } = useLanguage();

  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);
  const [bumping, setBumping] = useState<Set<string>>(new Set()); // ids mid-bump

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

  // Patch a single listing in the local list (optimistic updates).
  const patchItem = (id: string, patch: Partial<Listing>) =>
    setItems((cur) => (cur ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)));

  // Spend a bump (optimistic, favorites-style): decrement + light the "boosted"
  // badge immediately, reconcile/rollback on the DB result. Per-card lock.
  const onBumpNow = async (item: Listing) => {
    if (bumping.has(item.id)) return;
    const prev = item.bumpsRemaining;
    const prevBumpedAt = item.lastBumpedAt;
    setBumping((s) => new Set(s).add(item.id));
    patchItem(item.id, { bumpsRemaining: prev - 1, lastBumpedAt: new Date().toISOString() });

    const res = await bumpListing(item.id);
    setBumping((s) => {
      const n = new Set(s);
      n.delete(item.id);
      return n;
    });
    if (res.ok) {
      patchItem(item.id, { bumpsRemaining: res.bumpsRemaining });
    } else {
      patchItem(item.id, { bumpsRemaining: prev, lastBumpedAt: prevBumpedAt });
      if (res.reason === "empty") Alert.alert(t("promote.bumpEmptyTitle"), t("promote.bumpEmptyMsg"));
      else Alert.alert(t("common.loadError"));
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
              {/* Owner actions: wide Promote (headline) above a compact icon row */}
              <View style={{ gap: 8, marginTop: 8 }}>
                <Pressable
                  onPress={() => router.push(`/promote/${item.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                >
                  <LinearGradient
                    colors={brand.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      paddingVertical: 12,
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons name="trending-up" size={18} color="#FFFFFF" />
                    <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }}>
                      {t("myListings.promote")}
                    </Text>
                  </LinearGradient>
                </Pressable>

                {item.bumpsRemaining > 0 && (
                  <Pressable
                    onPress={() => onBumpNow(item)}
                    disabled={bumping.has(item.id)}
                    hitSlop={6}
                    accessibilityLabel={t("promote.bumpShort")}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: tint(brand.blue, 0.12),
                      opacity: bumping.has(item.id) ? 0.5 : pressed ? 0.6 : 1,
                    })}
                  >
                    <Ionicons name="arrow-up" size={18} color={brand.blue} />
                    <Text numberOfLines={1} style={{ color: brand.blue, fontSize: 14, fontWeight: "600" }}>
                      {`${t("promote.bumpShort")} · ${t(`promote.packBumps_${pluralSuffix(lang, item.bumpsRemaining)}`, { count: item.bumpsRemaining })}`}
                    </Text>
                  </Pressable>
                )}

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={() => router.push(`/add-listing?id=${item.id}`)}
                    hitSlop={6}
                    accessibilityLabel={t("myListings.edit")}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: tint(brand.violet, 0.12),
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
                    accessibilityLabel={t("myListings.delete")}
                    style={({ pressed }) => ({
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: tint(colors.danger, 0.12),
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

