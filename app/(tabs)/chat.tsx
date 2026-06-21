import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, Pressable, Alert, TextInput, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeIn, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
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
import { buildListingTitle } from "../../lib/listingTitle";
import { placeById, placeName } from "../../lib/places";
import { useLanguage } from "../../lib/i18n/languages";
import type { PropertyTypeKey } from "../../lib/propertyTypes";

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

// Fallback object-card icon when the listing has no cover photo.
const typeIcon = (pt: PropertyTypeKey): keyof typeof Ionicons.glyphMap =>
  pt === "house" ? "home-outline" : pt === "land" ? "leaf-outline" : pt === "object" ? "storefront-outline" : "business-outline";

// One of my listings + how many chats it has (for the "My objects" rail).
type ObjectGroup = { listingId: string; listing: NonNullable<ConversationListItem["listing"]>; count: number };

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
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null); // "My objects" filter
  const [objectsCollapsed, setObjectsCollapsed] = useState(false); // collapse the objects rail (visual only)

  // My listings that have chats (I'm the seller) → grouped with a count, for the
  // rail. Client-side over the already-loaded list; listings with no info skipped.
  const myObjects = useMemo<ObjectGroup[]>(() => {
    if (!list) return [];
    const m = new Map<string, ObjectGroup>();
    for (const c of list) {
      if (c.iAmBuyer || !c.listingId || !c.listing) continue;
      const cur = m.get(c.listingId);
      if (cur) cur.count += 1;
      else m.set(c.listingId, { listingId: c.listingId, listing: c.listing, count: 1 });
    }
    return Array.from(m.values());
  }, [list]);

  // If the selected object is gone (listing removed / no longer mine) → clear.
  useEffect(() => {
    if (selectedListingId && !myObjects.some((o) => o.listingId === selectedListingId)) {
      setSelectedListingId(null);
    }
  }, [myObjects, selectedListingId]);

  // Object filter changes (select / reset) — just swap the data. Smoothness comes
  // from each row's FadeIn entering animation (no whole-list opacity pulse).
  const selectObject = useCallback((id: string | null) => setSelectedListingId(id), []);

  // Visible rows: original (already sorted) list, filtered by the selected object
  // (if any) and the search query (peer name / district / last message). Order kept.
  const visible = useMemo(() => {
    if (!list) return [];
    let arr = selectedListingId ? list.filter((c) => c.listingId === selectedListingId) : list;
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter(
        (c) =>
          c.peerName.toLowerCase().includes(q) ||
          (c.listing?.district ?? "").toLowerCase().includes(q) ||
          c.lastBody.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [list, query, selectedListingId]);

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
            <>
              <SearchBar colors={colors} value={query} onChange={setQuery} placeholder={t("messages.searchPlaceholder")} />
              {myObjects.length > 0 && (
                <MyObjectsRail
                  colors={colors}
                  t={t}
                  objects={myObjects}
                  selectedId={selectedListingId}
                  onSelect={selectObject}
                  collapsed={objectsCollapsed}
                  onToggleCollapsed={() => setObjectsCollapsed((v) => !v)}
                />
              )}
            </>
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 86 }} />
          )}
          ListEmptyComponent={
            query.trim() || selectedListingId ? (
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
            <Animated.View entering={FadeIn.duration(180)}>
              <ChatRow
                colors={colors}
                item={item}
                t={t}
                onPress={() => router.push(`/chat/${item.id}`)}
                onAfterChange={load}
              />
            </Animated.View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// Horizontal rail of my listings (each with its chat count). Tapping a card
// filters the list to that object; tapping again / "All objects" clears it.
const RAIL_HEIGHT = 162; // ObjectCard (146²) + vertical padding for card shadows

function MyObjectsRail({
  colors,
  t,
  objects,
  selectedId,
  onSelect,
  collapsed,
  onToggleCollapsed,
}: {
  colors: Theme;
  t: (k: string, opts?: Record<string, unknown>) => string;
  objects: ObjectGroup[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  // Smoothly collapse only the rail (height + opacity); header stays put.
  const progress = useSharedValue(collapsed ? 0 : 1);
  useEffect(() => {
    progress.value = withTiming(collapsed ? 0 : 1, { duration: 250 });
  }, [collapsed, progress]);
  const railStyle = useAnimatedStyle(() => ({ height: progress.value * RAIL_HEIGHT, opacity: progress.value }));

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 8 }}>
        {/* Title + chevron toggles collapse */}
        <Pressable onPress={onToggleCollapsed} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ color: colors.text, fontFamily: font.bold, fontSize: 17 }}>{t("messages.myObjects")}</Text>
          <Ionicons name={collapsed ? "chevron-forward" : "chevron-down"} size={18} color={brand.violet} />
        </Pressable>
        {/* Reset filter — stays visible even while collapsed, so you can clear without expanding */}
        {selectedId && (
          <Pressable onPress={() => onSelect(null)} hitSlop={8}>
            <Text style={{ color: brand.violet, fontFamily: font.semibold, fontSize: 14 }}>{t("messages.reset")}</Text>
          </Pressable>
        )}
      </View>
      <Animated.View style={[{ overflow: "hidden" }, railStyle]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 12 }}>
          {objects.map((o) => (
            <ObjectCard
              key={o.listingId}
              colors={colors}
              t={t}
              item={o}
              active={selectedId === o.listingId}
              onPress={() => onSelect(selectedId === o.listingId ? null : o.listingId)}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// Compact object card — Home-style "info over photo" (price + title + district),
// plus a chat-count pill. Tap filters the list (not navigation). Selected = violet.
function ObjectCard({
  colors,
  t,
  item,
  active,
  onPress,
}: {
  colors: Theme;
  t: (k: string, opts?: Record<string, unknown>) => string;
  item: ObjectGroup;
  active: boolean;
  onPress: () => void;
}) {
  const { current: lang } = useLanguage();
  const l = item.listing;
  const title = buildListingTitle(l, t, lang, { withMetro: false, withRegion: false });
  const regionName = placeById(l.placeId) ? placeName(placeById(l.placeId)!, lang) : l.district;

  return (
    <Pressable onPress={onPress} style={{ width: 146 }}>
      <View
        style={{
          aspectRatio: 1,
          borderRadius: 16,
          backgroundColor: colors.border,
          borderWidth: 2,
          borderColor: active ? brand.violet : "transparent",
          shadowColor: "#000",
          shadowOpacity: active ? 0.14 : 0.06,
          shadowRadius: active ? 10 : 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: active ? 3 : 1,
        }}
      >
        <View style={{ flex: 1, borderRadius: 14, overflow: "hidden", backgroundColor: colors.border }}>
          {l.image ? (
            <Image source={{ uri: l.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={typeIcon(l.propertyType)} size={28} color={colors.textSecondary} />
            </View>
          )}

          {/* Chat-count pill — top-right */}
          <LinearGradient
            colors={brand.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 999,
            }}
          >
            <Ionicons name="chatbubble" size={10} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 10 }}>{item.count}</Text>
          </LinearGradient>

          {/* Bottom darkening for white info text */}
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.75)"]}
            locations={[0, 0.5, 1]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "65%" }}
          />

          {/* Info — price + title + district in white, over the gradient */}
          <View pointerEvents="none" style={{ position: "absolute", left: 10, right: 10, bottom: 10 }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{ color: "#FFFFFF", fontFamily: font.extrabold, fontSize: 16, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 4 }}
            >
              {formatPrice(l.priceAzn)}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: "rgba(255,255,255,0.95)", fontFamily: font.medium, fontSize: 11.5, marginTop: 2, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}
            >
              {title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.9)" />
              <Text
                numberOfLines={1}
                style={{ flexShrink: 1, marginLeft: 3, color: "rgba(255,255,255,0.9)", fontFamily: font.regular, fontSize: 11, textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 3 }}
              >
                {regionName}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
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
