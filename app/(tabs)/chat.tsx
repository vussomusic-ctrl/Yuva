import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, FlatList, Alert } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useFocusEffect, useRouter } from "expo-router";
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

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [list, setList] = useState<ConversationListItem[] | null>(null);
  const [error, setError] = useState(false);

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
      load();
      if (!user) return;
      const unsub = subscribeMyConversations(onListInsert);
      return unsub;
    }, [load, user, onListInsert]),
  );

  const loading = list === null && !error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: section title only. No logo. */}
      <View style={{ height: 56, justifyContent: "center", paddingHorizontal: 16 }}>
        <Text style={{ color: colors.text, fontFamily: font.extrabold, fontSize: 22 }}>
          {t("messages.title")}
        </Text>
      </View>

      {loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <FlatList
          data={list ?? []}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96, flexGrow: 1 }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 84 }} />
          )}
          ListEmptyComponent={
            <EmptyState
              image={require("../../assets/icons/empty/empty-chats.png")}
              title={t("messages.emptyTitle")}
              subtitle={t("messages.emptyDesc")}
            />
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
        paddingVertical: 12,
        backgroundColor: colors.bg,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {item.peerAvatar ? (
        <Image
          source={{ uri: item.peerAvatar }}
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card }}
        />
      ) : (
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="person" size={28} color="#FFFFFF" />
        </View>
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontFamily: font.bold, fontSize: 16 }}>
            {item.peerName}
          </Text>
          {item.isPinned && (
            <Ionicons name="pin" size={12} color={colors.textSecondary} style={{ marginLeft: 6 }} />
          )}
          <Text style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12, marginLeft: 8 }}>
            {formatListTime(item.lastAt)}
          </Text>
        </View>
        {/* Which property this chat is about — district · price, or "removed". */}
        <Text numberOfLines={1} style={{ color: colors.textSecondary, fontFamily: font.regular, fontSize: 12 }}>
          {item.listing
            ? `${item.listing.district} · ${formatPrice(item.listing.priceAzn)}`
            : t("messages.listingUnavailable")}
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
              style={{
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                paddingHorizontal: 6,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 11 }}>{item.unreadCount}</Text>
            </LinearGradient>
          )}
        </View>
      </View>
    </Pressable>
    </ReanimatedSwipeable>
  );
}
