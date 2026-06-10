import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useTheme } from "../../lib/theme/ThemeContext";
import { brand, Theme } from "../../lib/theme/colors";
import { LoadingState, ErrorState } from "../../components/ListState";
import { useAuth } from "../../lib/auth";
import { getMessages, getConversationMeta, sendMessage, Message } from "../../lib/api/chats";

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

export default function ConversationScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const listRef = useRef<FlatList<Message>>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [meta, setMeta] = useState<{ peerName: string; peerAvatar: string } | null>(null);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");

  // Load messages + peer meta on focus (no realtime yet — that's 4C; the peer's
  // new messages appear after a refetch / re-entering the screen).
  const load = useCallback(() => {
    if (!id) return;
    setError(false);
    Promise.all([getMessages(id), getConversationMeta(id)])
      .then(([msgs, m]) => {
        setMessages(msgs);
        setMeta(m);
      })
      .catch(() => setError(true));
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loading = messages === null && !error;

  // Optimistic send: show the bubble immediately, swap for the real row, or roll
  // back + restore the draft on failure.
  const send = async () => {
    const body = draft.trim();
    if (!body || !user || !id) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: id,
      sender_id: user.id,
      body,
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages((cur) => [...(cur ?? []), optimistic]);
    setDraft("");
    try {
      const real = await sendMessage(id, body);
      setMessages((cur) => (cur ?? []).map((m) => (m.id === tempId ? real : m)));
    } catch {
      setMessages((cur) => (cur ?? []).filter((m) => m.id !== tempId));
      setDraft(body);
      Alert.alert(t("messages.errSend"));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Contextual header: back + avatar + peer name. No logo. */}
      <Header
        colors={colors}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/chat"))}
        name={meta?.peerName}
        avatar={meta?.peerAvatar}
      />

      {loading ? (
        <LoadingState colors={colors} />
      ) : error ? (
        <ErrorState colors={colors} onRetry={load} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages ?? []}
            keyExtractor={(m) => m.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, gap: 2, flexGrow: 1 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: "center" }}>
                  {t("messages.startConversation")}
                </Text>
              </View>
            }
            renderItem={({ item }) => <Bubble colors={colors} message={item} mine={item.sender_id === user?.id} />}
          />

          {/* Composer — input + send */}
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
      )}
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
      {avatar ? (
        <Image
          source={{ uri: avatar }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card }}
        />
      ) : (
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: brand.violet, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="person" size={20} color="#FFFFFF" />
        </View>
      )}
      {name != null && (
        <Text numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: "700" }}>
          {name}
        </Text>
      )}
    </View>
  );
}

function Bubble({ colors, message, mine }: { colors: Theme; message: Message; mine: boolean }) {
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
        {formatTime(message.created_at)}
      </Text>
    </View>
  );
}
