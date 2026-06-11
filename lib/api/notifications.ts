// Notifications from the DB (inserted by triggers — message / price_drop). The
// screen-facing `AppNotification` union is built from the row's type + jsonb
// payload here. RLS scopes every read/update to the current user.

import { supabase } from "../supabase";

export type AppNotification =
  | {
      id: string;
      type: "price_drop";
      listingId: string;
      oldPrice: number;
      newPrice: number;
      time: string;
      read: boolean;
    }
  | {
      id: string;
      type: "new_match";
      listingId: string;
      time: string;
      read: boolean;
    }
  | {
      id: string;
      type: "message";
      conversationId: string;
      peerName: string;
      preview: string;
      time: string;
      read: boolean;
    };

type NotificationRow = {
  id: string;
  type: "price_drop" | "new_match" | "message";
  payload: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

const SELECT = "id, type, payload, read, created_at";

// created_at → short display string: HH:MM today, else DD.MM.
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return d.toDateString() === now.toDateString()
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0) || 0;
}

function rowToNotification(row: NotificationRow): AppNotification {
  const time = formatTime(row.created_at);
  const p = row.payload ?? {};
  if (row.type === "message") {
    return {
      id: row.id,
      type: "message",
      conversationId: str(p.conversation_id),
      peerName: str(p.peer_name),
      preview: str(p.preview),
      time,
      read: row.read,
    };
  }
  if (row.type === "price_drop") {
    return {
      id: row.id,
      type: "price_drop",
      listingId: str(p.listing_id),
      oldPrice: num(p.old_price),
      newPrice: num(p.new_price),
      time,
      read: row.read,
    };
  }
  return { id: row.id, type: "new_match", listingId: str(p.listing_id), time, read: row.read };
}

/** My notifications, newest first (RLS scopes to me). */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as NotificationRow[]) ?? []).map(rowToNotification);
}

/** Count of my unread notifications (for the Home bell badge). */
export async function unreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

/** Mark one notification read. */
export async function markRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

/** Mark all my unread notifications read (RLS scopes to me). */
export async function markAllRead(): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
  if (error) throw error;
}

/**
 * Live-subscribe to my new notifications (for the bell badge). RLS-filtered to
 * my rows; also filtered by user_id for good measure. Fires onInsert per row.
 * Returns an unsubscribe fn.
 */
export function subscribeNotifications(uid: string, onInsert: () => void): () => void {
  const channel = supabase
    .channel(`notifications:${uid}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
      () => onInsert(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
