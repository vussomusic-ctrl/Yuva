import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, Pressable, Alert, TextInput, StyleSheet } from "react-native";
import Animated, { useAnimatedScrollHandler, withSpring } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useFocusEffect, useRouter } from "expo-router";
import { useScrollCtx } from "../../lib/scrollContext";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { font } from "../../lib/theme/typography";
import { LoadingState, ErrorState } from "../../components/ListState";
import { EmptyState } from "../../components/EmptyState";
import { useAuth } from "../../lib/auth";
import {
  getMyConversations,
  hideConversation,
  setConversationPinned,
  subscribeMyConversations,
  sortConversations,
  ConversationListItem,
  Message,
} from "../../lib/api/chats";
import { formatPrice } from "../../lib/mock/listings";

const formatListTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return d.toDateString() === now.toDateString()
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
};

// Soft pastel avatar tints (bg + readable dark-of-same-hue text). Picked
// deterministically from the name so one person always gets the same colour.
const AVATAR_TINTS: { bg: string; fg: string }[] = [
  { bg: "#E7DEF8", fg: "#6B3FA0" }, // lavender
  { bg: "#DCE9FB", fg: "#2E5C9E" }, // soft blue
  { bg: "#DDF0E4", fg: "#2F7A55" }, // soft green
  { bg: "#FBE7D8", fg: "#B5642A" }, // peach
  { bg: "#FBE0EC", fg: "#B23A75" }, // soft pink
  { bg: "#D9F0EF", fg: "#2E7E78" }, // mint
  { bg: "#F0E6D6", fg: "#8A6A3A" }, // sand
  { bg: "#E6E2F2", fg: "#5A4E86" }, // muted violet-grey
];

const avatarTint = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
};

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { scrollY } = useScrollCtx();
  const scrollHandler = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });

  const [list, setList] = useState<ConversationListItem[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState(""); // local search filter (no server round-trip)

  // Visible rows: original (already sorted) list filtered by the search query
  // over peer name / listing district / last message. Order is preserved.
  const visible = useMemo(() => {
    if (!list) return [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.peerName.toLowerCase().includes(q) ||
        (c.listing?.district ?? "").toLowerCase().includes(q) ||
        c.lastBody.toLowerCase().includes(q),
    );
  }, [list, query]);

  // Mirror of `list` for the realtime handler — lets it decide patch-vs-refetch
  // synchronously without depending on (and re-subscribing per) list changes.
  const listRef = useRef<ConversationListItem[] | null>(null);
  useEffect(() => { listRef.current = list; }, [list]);

  const load = useCallback(() => {
    if (!user) {
      setList([]);
      return;
    }
    setError(false);
    getMyConversations()
      .then(setList)
      .catch(() => setError(true));
  }, [user]);

  // A new message in one of my conversations → patch that row live (last
  // message / time / unread) and re-sort. Unknown conversation (brand-new) →
  // full refetch to pull peer name + listing. unread++ only for the peer's
  // messages (my own from another device bumps the row, not the badge).
  const onListInsert = useCallback(
    (m: Message) => {
      const cur = listRef.current;
      if (!cur || cur.findIndex((c) => c.id === m.conversation_id) === -1) {
        load();
        return;
      }
      setList((prev) => {
        if (!prev) return prev;
        const i = prev.findIndex((c) => c.id === m.conversation_id);
        if (i === -1) return prev;
        const next = prev.slice();
        const row = next[i];
        next[i] = {
          ...row,
          lastBody: m.body,
          lastAt: m.created_at,
          unreadCount: m.sender_id !== user?.id ? row.unreadCount + 1 : row.unreadCount,
        };
        return sortConversations(next);
      });
    },
    [user?.id, load],
  );

  // On focus: refetch (full correctness, catches anything missed while away) +
  // subscribe for live updates while watching. On blur: unsubscribe. Guests get
  // neither (no conversations).
  useFocusEffect(
    useCallback(() => {
      scrollY.value = withSpring(0, { damping: 18, stiffness: 120 }); // expand bar on focus
      load();
      if (!user) return;
      const unsub = subscribeMyConversations(onListInsert);
      return unsub;
    }, [load, user, onListInsert, scrollY]),
  );

  const loading = list === null && !error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: title + mail-bird mascot. No logo. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 2,
          paddingBottom: 6,
        }}
      >
        <Text style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 28 }}>
          {t("messages.title")}
        </Text>
        <Image source={require("../../assets/icons/deals/bird-mail.png")} style={{ width: 96, height: 96 }} resizeMode="contain" />
      </View>

      {loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <Animated.FlatList
          data={visible}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96, flexGrow: 1, paddingTop: 2 }}
          ListHeaderComponent={
            <SearchBar colors={colors} value={query} onChange={setQuery} placeholder={t("messages.searchPlaceholder")} />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 86 }} />
          )}
          ListEmptyComponent={
            query.trim() ? (
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: font.medium, fontSize: 15 }}>{t("messages.noResults")}</Text>
              </View>
            ) : (
              <EmptyState
                image={require("../../assets/icons/empty/empty-chats.png")}
                title={t("messages.emptyTitle")}
                subtitle={t("messages.emptyDesc")}
              />
            )
          }
          renderItem={({ item }) => (
            <ChatRow
              colors={colors}
              item={item}
              t={t}
              onPress={() => router.push(`/chat/${item.id}`)}
              onAfterChange={load}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// Local search field — white raised pill; filters the list client-side.
function SearchBar({
  colors,
  value,
  onChange,
  placeholder,
}: {
  colors: Theme;
  value: string;
  onChange: (s: string) => void;
  placeholder: string;
}) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 12 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          height: 48,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          style={{ flex: 1, color: colors.text, fontFamily: font.regular, fontSize: 15, padding: 0 }}
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChange("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ChatRow({
  colors,
  item,
  t,
  onPress,
  onAfterChange,
}: {
  colors: Theme;
  item: ConversationListItem;
  t: (k: string) => string;
  onPress: () => void;
  onAfterChange: () => void;
}) {
  const preview = item.lastBody || t("messages.noMessages");
  const initial = item.peerName.trim().charAt(0).toUpperCase();
  const tint = avatarTint(item.peerName.trim() || "?");

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={(_progress, _translation, methods) => (
          <View style={{ flexDirection: "row" }}>
            {/* Pin / unpin — my-side toggle, no confirm */}
            <Pressable
              onPress={() => {
                methods.close();
                setConversationPinned(item.id, item.iAmBuyer, !item.isPinned)
                  .then(onAfterChange)
                  .catch(() => {});
              }}
              style={{ width: 76, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              <Ionicons name={item.isPinned ? "pin-outline" : "pin"} size={20} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 11 }}>
                {t(item.isPinned ? "messages.unpin" : "messages.pin")}
              </Text>
            </Pressable>
            {/* Delete — hide on my side only, with confirm */}
            <Pressable
              onPress={() => {
                methods.close();
                Alert.alert(t("messages.deleteConfirmTitle"), t("messages.deleteConfirmMsg"), [
                  { text: t("common.cancel"), style: "cancel" },
                  {
                    text: t("messages.delete"),
                    style: "destructive",
                    onPress: () =>
                      hideConversation(item.id, item.iAmBuyer).then(onAfterChange).catch(() => {}),
                  },
                ]);
              }}
              style={{ width: 76, backgroundColor: brand.magenta, alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontFamily: font.bold, fontSize: 11 }}>{t("messages.delete")}</Text>
            </Pressable>
          </View>
        )}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 13,
            backgroundColor: colors.bg,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          {/* Avatar + unread presence dot */}
          <View>
            {item.peerAvatar ? (
              <Image source={{ uri: item.peerAvatar }} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.bg }} />
            ) : initial ? (
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: tint.bg, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: tint.fg, fontFamily: font.bold, fontSize: 22 }}>{initial}</Text>
              </View>
            ) : (
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="person" size={26} color={colors.textSecondary} />
              </View>
            )}
            {item.unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 15,
                  height: 15,
                  borderRadius: 8,
                  backgroundColor: brand.violet,
                  borderWidth: 2.5,
                  borderColor: colors.bg,
                }}
              />
            )}
          </View>

          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: font.bold, fontSize: 16 }}>
                {item.peerName}
              </Text>
              {item.isPinned && <Ionicons name="pin" size={12} color={colors.textSecondary} style={{ marginLeft: 6 }} />}
              <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12, marginLeft: 8 }}>
                {formatListTime(item.lastAt)}
              </Text>
            </View>
            {/* Which property this chat is about — district · price, or "removed". */}
            <Text numberOfLines={1} style={{ color: brand.violet, fontFamily: font.medium, fontSize: 12 }}>
              {item.listing ? `${item.listing.district} · ${formatPrice(item.listing.priceAzn)}` : t("messages.listingUnavailable")}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: item.unreadCount > 0 ? colors.text : colors.textSecondary,
                  fontFamily: item.unreadCount > 0 ? font.semibold : font.regular,
                  fontSize: 14,
                }}
              >
                {preview}
              </Text>
              {item.unreadCount > 0 && (
                <LinearGradient
                  colors={brand.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 11 }}>{item.unreadCount}</Text>
                </LinearGradient>
              )}
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
    </ReanimatedSwipeable>
  );
}
