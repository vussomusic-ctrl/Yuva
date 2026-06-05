import { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { getChat, ChatMessage } from "../../lib/mock/chats";

export default function ConversationScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const chat = getChat(id);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(chat?.messages ?? []);
  const [draft, setDraft] = useState("");

  // Local-only send — no backend. Appends to in-memory state; lost on reload.
  // Wire to Supabase `messages` (realtime insert) later.
  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    setMessages((cur) => [
      ...cur,
      { id: `local-${Date.now()}`, fromMe: true, body, time },
    ]);
    setDraft("");
  };

  if (!chat) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <Header colors={colors} onBack={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + avatar + peer name. No logo. */}
      <Header
        colors={colors}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/chat"))}
        name={chat.peerName}
        avatar={chat.peerAvatar}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, gap: 2 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => <Bubble colors={colors} message={item} />}
        />

        {/* Composer — input + send (local only) */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          <View
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              justifyContent: "center",
              borderRadius: 22,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t("messages.inputPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              multiline
              style={{ color: colors.text, fontSize: 15, padding: 0 }}
              onSubmitEditing={send}
            />
          </View>
          <Pressable onPress={send} disabled={!draft.trim()} hitSlop={6}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: draft.trim() ? brand.violet : colors.border,
              }}
            >
              <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({
  colors,
  onBack,
  name,
  avatar,
}: {
  colors: Theme;
  onBack: () => void;
  name?: string;
  avatar?: string;
}) {
  return (
    <View
      style={{
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Pressable onPress={onBack} hitSlop={10} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </Pressable>
      {avatar && (
        <Image
          source={{ uri: avatar }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card }}
        />
      )}
      {name && (
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: "700" }}>
          {name}
        </Text>
      )}
    </View>
  );
}

function Bubble({ colors, message }: { colors: Theme; message: ChatMessage }) {
  const mine = message.fromMe;
  return (
    <View style={{ alignItems: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
      <View
        style={{
          maxWidth: "80%",
          borderRadius: 18,
          borderBottomRightRadius: mine ? 4 : 18,
          borderBottomLeftRadius: mine ? 18 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: mine ? brand.violet : colors.card,
          borderWidth: mine ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: mine ? "#FFFFFF" : colors.text, fontSize: 15, lineHeight: 20 }}>
          {message.body}
        </Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4, marginHorizontal: 4 }}>
        {message.time}
      </Text>
    </View>
  );
}
