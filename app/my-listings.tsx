import { useCallback, useState } from "react";
import { View, Text, Pressable, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand, Theme } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { OwnerListingRow } from "../components/OwnerListingRow";
import { BottomSheet } from "../components/BottomSheet";
import { LoadingState, ErrorState } from "../components/ListState";
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../lib/auth";
import { useLanguage } from "../lib/i18n/languages";
import { pluralSuffix } from "../lib/i18n/plural";
import { Listing } from "../lib/mock/listings";
import { buildListingTitle } from "../lib/listingTitle";
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
  const { user } = useAuth();
  const { current: lang } = useLanguage();

  const [items, setItems] = useState<Listing[] | null>(null);
  const [error, setError] = useState(false);
  const [bumping, setBumping] = useState<Set<string>>(new Set()); // ids mid-bump
  const [menuItem, setMenuItem] = useState<Listing | null>(null); // actions sheet target

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

  const list = items ?? [];
  const activeN = list.filter((l) => (l.status ?? "active") === "active").length;
  const modN = list.filter((l) => l.status === "moderation").length;

  const closeMenu = () => setMenuItem(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header
        colors={colors}
        title={t("myListings.title")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/profile"))}
      />

      {/* Summary line — counts from the loaded list (first-wave, plain text) */}
      {list.length > 0 && (
        <Text style={{ paddingHorizontal: 16, paddingBottom: 8, color: colors.textSecondary, fontFamily: font.regular, fontSize: 13 }}>
          {`${t("profile.nActive", { n: activeN })} · ${t("profile.nModeration", { n: modN })}`}
        </Text>
      )}

      {loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(l) => l.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <EmptyState
              image={require("../assets/icons/empty/house-keys-bonus.png")}
              title={t("myListings.emptyTitle")}
              subtitle={t("myListings.emptyDesc")}
            />
          }
          renderItem={({ item }) => (
            <OwnerListingRow
              listing={item}
              colors={colors}
              lang={lang}
              onPress={() => router.push(`/property/${item.id}`)}
              onMenu={() => setMenuItem(item)}
            />
          )}
        />
      )}

      {/* Actions sheet for the tapped "⋯" */}
      <BottomSheet visible={menuItem !== null} onClose={closeMenu}>
        {menuItem && (
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 8 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontFamily: font.bold, fontSize: 16, paddingHorizontal: 4, paddingBottom: 4 }}>
              {buildListingTitle(menuItem, t, lang)}
            </Text>

            {/* Promote — primary gradient row */}
            <Pressable
              onPress={() => { const id = menuItem.id; closeMenu(); router.push(`/promote/${id}`); }}
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <LinearGradient
                colors={brand.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14 }}
              >
                <Ionicons name="trending-up" size={20} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 15 }}>{t("myListings.promote")}</Text>
              </LinearGradient>
            </Pressable>

            {menuItem.bumpsRemaining > 0 && (
              <MenuRow
                icon="arrow-up"
                color={brand.blue}
                label={`${t("promote.bumpShort")} · ${t(`promote.packBumps_${pluralSuffix(lang, menuItem.bumpsRemaining)}`, { count: menuItem.bumpsRemaining })}`}
                disabled={bumping.has(menuItem.id)}
                colors={colors}
                onPress={() => { const it = menuItem; closeMenu(); onBumpNow(it); }}
              />
            )}
            <MenuRow
              icon="create-outline"
              color={brand.violet}
              label={t("myListings.edit")}
              colors={colors}
              onPress={() => { const id = menuItem.id; closeMenu(); router.push(`/add-listing?id=${id}`); }}
            />
            <MenuRow
              icon="trash-outline"
              color={colors.danger}
              label={t("myListings.delete")}
              colors={colors}
              onPress={() => { const it = menuItem; closeMenu(); confirmDelete(it); }}
            />
          </View>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

// One action row inside the "⋯" sheet: tinted icon + label.
function MenuRow({
  icon,
  color,
  label,
  colors,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  colors: Theme;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: tint(color, 0.1),
        opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={{ color, fontFamily: font.semibold, fontSize: 15 }}>{label}</Text>
    </Pressable>
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

