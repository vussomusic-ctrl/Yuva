import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../lib/theme/ThemeContext";
import { brand } from "../lib/theme/colors";
import { font } from "../lib/theme/typography";
import { usePressScale } from "../lib/animations";
import { Header } from "./my-listings";
import { EmptyState } from "../components/EmptyState";
import { LoadingState, ErrorState } from "../components/ListState";
import {
  AppNotification,
  fetchNotifications,
  markRead,
  markAllRead,
} from "../lib/api/notifications";
import { Listing, formatPrice } from "../lib/mock/listings";
import { fetchListingsByIds } from "../lib/api/listings";
import { buildListingTitle } from "../lib/listingTitle";
import { useLanguage } from "../lib/i18n/languages";
import { useAuth } from "../lib/auth";

const META: Record<
  AppNotification["type"],
  { icon: keyof typeof Ionicons.glyphMap; color: string; titleKey: string }
> = {
  // Blue is used only as an icon FILL here (never as a border) — allowed by brand rules.
  price_drop: { icon: "trending-down", color: brand.magenta, titleKey: "notifications.priceDrop" },
  new_match: { icon: "sparkles", color: brand.violet, titleKey: "notifications.newMatch" },
  message: { icon: "chatbubble-ellipses", color: brand.blue, titleKey: "notifications.message" },
};

// Brand hex → low-opacity rgba for the icon's circular tint.
function tint(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const loggedIn = !!session;

  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [byId, setById] = useState<Record<string, Listing>>({});
  const [error, setError] = useState(false);

  // From the DB (RLS scopes to me). A second fetch resolves the listing titles
  // for price_drop / new_match previews (message carries its own snapshot).
  const load = useCallback(() => {
    if (!loggedIn) {
      setItems([]);
      setById({});
      return;
    }
    setError(false);
    fetchNotifications()
      .then((list) => {
        setItems(list);
        const ids = Array.from(
          new Set(
            list
              .filter((n) => n.type !== "message")
              .map((n) => (n as { listingId: string }).listingId)
              .filter(Boolean),
          ),
        );
        if (ids.length === 0) {
          setById({});
          return;
        }
        fetchListingsByIds(ids)
          .then((ls) => setById(Object.fromEntries(ls.map((l) => [l.id, l]))))
          .catch(() => setById({}));
      })
      .catch(() => setError(true));
  }, [loggedIn]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = items === null && !error;
  const hasUnread = (items ?? []).some((n) => !n.read);

  const onMarkAll = () => {
    setItems((cur) => (cur ?? []).map((x) => ({ ...x, read: true })));
    markAllRead().catch(() => {});
  };

  const open = (n: AppNotification) => {
    if (!n.read) {
      setItems((cur) => (cur ?? []).map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      markRead(n.id).catch(() => {});
    }
    if (n.type === "message") router.push(`/chat/${n.conversationId}`);
    else router.push(`/property/${n.listingId}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + title. No logo. */}
      <Header
        colors={colors}
        title={t("notifications.title")}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
      />

      {!loggedIn ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
          <Image source={require("../assets/auth/bell-guest.png")} resizeMode="contain" style={{ width: 120, height: 120 }} />
          <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14, textAlign: "center" }}>
            {t("notifications.guestPrompt")}
          </Text>
          <GradientButton label={t("profile.login")} onPress={() => router.replace("/login")} />
        </View>
      ) : loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <FlatList
          data={items ?? []}
          keyExtractor={(n) => n.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
          ListHeaderComponent={
            hasUnread ? (
              <Pressable
                onPress={onMarkAll}
                hitSlop={8}
                style={({ pressed }) => ({ alignSelf: "flex-end", paddingHorizontal: 16, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: brand.violet, fontFamily: font.bold, fontSize: 13 }}>
                  {t("notifications.markAllRead")}
                </Text>
              </Pressable>
            ) : null
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 72 }} />
          )}
          ListEmptyComponent={
            <EmptyState
              image={require("../assets/icons/empty/empty-notifications.png")}
              title={t("notifications.emptyTitle")}
              subtitle={t("notifications.emptyDesc")}
            />
          }
          renderItem={({ item }) => <Row item={item} byId={byId} onPress={() => open(item)} />}
        />
      )}
    </SafeAreaView>
  );
}

function GradientButton({ label, onPress }: { label: string; onPress: () => void }) {
  const press = usePressScale();
  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={{ alignSelf: "center", marginTop: 6 }}>
      <Animated.View style={press.style}>
        <LinearGradient
          colors={brand.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ paddingVertical: 14, paddingHorizontal: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 16 }}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

function Row({
  item,
  byId,
  onPress,
}: {
  item: AppNotification;
  byId: Record<string, Listing>;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { current: lang } = useLanguage();
  const { colors, mode } = useTheme();
  const meta = META[item.type];

  const subtitle =
    item.type === "message"
      ? `${item.peerName}: ${item.preview}`
      : (() => {
          const l = byId[item.listingId];
          return l ? buildListingTitle(l, t, lang) : "";
        })();

  // Unread rows get a subtle violet wash (brand color, low opacity — not a border).
  const unreadBg = mode === "dark" ? "rgba(139,63,214,0.14)" : "rgba(139,63,214,0.06)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: item.read ? "transparent" : unreadBg,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tint(meta.color, mode === "dark" ? 0.22 : 0.12),
        }}
      >
        <Ionicons name={meta.icon} size={22} color={meta.color} />
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, color: colors.text, fontFamily: item.read ? font.semibold : font.bold, fontSize: 15 }}
          >
            {t(meta.titleKey)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12, marginLeft: 8 }}>
            {item.time}
          </Text>
        </View>

        <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 14 }}>
          {subtitle}
        </Text>

        {item.type === "price_drop" && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 13, textDecorationLine: "line-through" }}>
              {formatPrice(item.oldPrice)}
            </Text>
            <Ionicons name="arrow-forward" size={12} color={colors.textSecondary} />
            <Text style={{ color: brand.magenta, fontFamily: font.extrabold, fontSize: 14 }}>
              {formatPrice(item.newPrice)}
            </Text>
          </View>
        )}
      </View>

      {/* Unread indicator */}
      {!item.read && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: brand.magenta, marginTop: 6 }} />
      )}
    </Pressable>
  );
}
