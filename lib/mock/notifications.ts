// Mock notifications. Replace with Supabase `notifications`
// (user_id, type, payload, read, created_at) later.
//
// `time` is stored language-neutral (clock / date), like Messages. Notification
// labels are localized in the screen; referenced content (listing titles, chat
// previews, peer names) is user-generated and NOT translated.

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
      chatId: string;
      peerName: string;
      preview: string;
      time: string;
      read: boolean;
    };

export const notifications: AppNotification[] = [
  { id: "n1", type: "price_drop", listingId: "1", oldPrice: 265000, newPrice: 245000, time: "09:12", read: false },
  { id: "n2", type: "new_match", listingId: "4", time: "08:40", read: false },
  { id: "n3", type: "message", chatId: "c1", peerName: "Rəşad Əliyev", preview: "Saat 18:00 olar?", time: "14:32", read: false },
  { id: "n4", type: "price_drop", listingId: "3", oldPrice: 185000, newPrice: 178000, time: "12.05", read: true },
  { id: "n5", type: "new_match", listingId: "6", time: "11.05", read: true },
];

export const hasUnreadNotifications = notifications.some((n) => !n.read);
