import { View, Text, Image, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { chats, Chat } from "../../lib/mock/chats";

export default function ChatListScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: section title only. No logo. */}
      <View style={{ height: 56, justifyContent: "center", paddingHorizontal: 16 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
          {t("messages.title")}
        </Text>
      </View>

      <FlatList
        data={chats}
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
          <ChatRow colors={colors} chat={item} onPress={() => router.push(`/chat/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}

function ChatRow({ colors, chat, onPress }: { colors: Theme; chat: Chat; onPress: () => void }) {
  const last = chat.messages[chat.messages.length - 1];
  const preview = last?.body ?? "";

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
      <Image
        source={{ uri: chat.peerAvatar }}
        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card }}
      />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "700" }}>
            {chat.peerName}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 8 }}>
            {chat.lastTime}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: chat.unread > 0 ? colors.text : colors.textSecondary,
              fontSize: 14,
              fontWeight: chat.unread > 0 ? "600" : "400",
            }}
          >
            {preview}
          </Text>
          {chat.unread > 0 && (
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
              <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{chat.unread}</Text>
            </LinearGradient>
          )}
        </View>
      </View>
    </Pressable>
  );
}
