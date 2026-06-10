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
