import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { LoadingState, ErrorState } from "../../components/ListState";
import { useAuth } from "../../lib/auth";
import { getMyConversations, ConversationListItem } from "../../lib/api/chats";
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [list, setList] = useState<ConversationListItem[] | null>(null);
  const [error, setError] = useState(false);

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
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = list === null && !error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: section title only. No logo. */}
      <View style={{ height: 56, justifyContent: "center", paddingHorizontal: 16 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
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
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 84 }} />
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>
                {t("messages.emptyTitle")}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
                {t("messages.emptyDesc")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ChatRow colors={colors} item={item} t={t} onPress={() => router.push(`/chat/${item.id}`)} />
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
}: {
  colors: Theme;
  item: ConversationListItem;
  t: (k: string) => string;
  onPress: () => void;
}) {
  const preview = item.lastBody || t("messages.noMessages");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
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
          <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "700" }}>
            {item.peerName}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 8 }}>
            {formatListTime(item.lastAt)}
          </Text>
        </View>
        {/* Which property this chat is about — district · price, or "removed". */}
        <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 12 }}>
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
              fontSize: 14,
              fontWeight: item.unreadCount > 0 ? "600" : "400",
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
              <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{item.unreadCount}</Text>
            </LinearGradient>
          )}
        </View>
      </View>
    </Pressable>
  );
}
