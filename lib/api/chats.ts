// Supabase data access for chat (conversations + messages). All scoped to the
// current user by RLS (participant-only). Read fns throw on error; screens show
// an error/retry state.

import { supabase } from "../supabase";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read: boolean;
  created_at: string;
};

export type ConversationListItem = {
  id: string;
  peerName: string;
  peerAvatar: string;
  lastBody: string;
  lastAt: string; // ISO; falls back to the conversation's created_at
  unreadCount: number;
  listingId: string | null;
};

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("not authenticated");
  return uid;
}

/**
 * Find the buyer↔seller conversation for this listing, or create it. The
 * unique(listing_id, buyer_id) constraint guarantees one per (listing, buyer);
 * on a race the insert conflicts → we re-select. Returns the conversation id.
 */
export async function getOrCreateConversation(
  listingId: string,
  sellerId: string,
): Promise<string> {
  const me = await currentUserId();

  const existing = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", me)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return (existing.data as { id: string }).id;

  const created = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: me, seller_id: sellerId })
    .select("id")
    .single();

  if (!created.error && created.data) return (created.data as { id: string }).id;

  // Race: someone (or a double-tap) created it first → re-select.
  const again = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", me)
    .maybeSingle();
  if (again.error || !again.data) throw created.error ?? again.error ?? new Error("conversation failed");
  return (again.data as { id: string }).id;
}

/** The other participant's display name + avatar for the conversation header. */
export async function getConversationMeta(
  conversationId: string,
): Promise<{ peerName: string; peerAvatar: string }> {
  const me = await currentUserId();
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "buyer_id, seller_id, buyer:profiles!conversations_buyer_id_fkey(full_name, avatar_url), seller:profiles!conversations_seller_id_fkey(full_name, avatar_url)",
    )
    .eq("id", conversationId)
    .single();
  if (error) throw error;

  const row = data as unknown as {
    buyer_id: string;
    seller_id: string;
    buyer: { full_name: string | null; avatar_url: string | null } | null;
    seller: { full_name: string | null; avatar_url: string | null } | null;
  };
  const peer = row.buyer_id === me ? row.seller : row.buyer;
  return { peerName: peer?.full_name ?? "", peerAvatar: peer?.avatar_url ?? "" };
}

/** All messages in a conversation, oldest first. */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Message[]) ?? [];
}

/**
 * My conversations (as buyer or seller) for the Chats list. Two queries, no
 * VIEW/RPC: (1) conversations + both profiles; (2) all their messages, folded
 * in one JS pass into last-message + unread-count per conversation. Sorted by
 * most recent activity. Conversations with no messages are kept (a "Написать"
 * tap creates one before the first message).
 */
export async function getMyConversations(): Promise<ConversationListItem[]> {
  const me = await currentUserId();

  const { data: convData, error: convErr } = await supabase
    .from("conversations")
    .select(
      "id, listing_id, buyer_id, seller_id, created_at, buyer:profiles!conversations_buyer_id_fkey(full_name, avatar_url), seller:profiles!conversations_seller_id_fkey(full_name, avatar_url)",
    )
    .or(`buyer_id.eq.${me},seller_id.eq.${me}`);
  if (convErr) throw convErr;

  type ConvRow = {
    id: string;
    listing_id: string | null;
    buyer_id: string;
    seller_id: string;
    created_at: string;
    buyer: { full_name: string | null; avatar_url: string | null } | null;
    seller: { full_name: string | null; avatar_url: string | null } | null;
  };
  const convs = (convData as unknown as ConvRow[]) ?? [];
  if (convs.length === 0) return [];

  // (2) last message + unread per conversation, folded in one pass.
  const ids = convs.map((c) => c.id);
  const summary = new Map<string, { lastBody: string; lastAt: string; unreadCount: number }>();
  const { data: msgData, error: msgErr } = await supabase
    .from("messages")
    .select("conversation_id, sender_id, body, read, created_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });
  if (msgErr) throw msgErr;

  for (const m of (msgData as Message[]) ?? []) {
    const cur = summary.get(m.conversation_id) ?? { lastBody: "", lastAt: "", unreadCount: 0 };
    cur.lastBody = m.body; // asc order → last seen wins
    cur.lastAt = m.created_at;
    if (m.sender_id !== me && !m.read) cur.unreadCount += 1;
    summary.set(m.conversation_id, cur);
  }

  const items: ConversationListItem[] = convs.map((c) => {
    const peer = c.buyer_id === me ? c.seller : c.buyer;
    const s = summary.get(c.id);
    return {
      id: c.id,
      peerName: peer?.full_name ?? "",
      peerAvatar: peer?.avatar_url ?? "",
      lastBody: s?.lastBody ?? "",
      lastAt: s?.lastAt ?? c.created_at,
      unreadCount: s?.unreadCount ?? 0,
      listingId: c.listing_id,
    };
  });

  items.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  return items;
}

/** Send a message; returns the inserted row (id + created_at for the UI). */
export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const me = await currentUserId();
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: me, body })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("send failed");
  return data as Message;
}
