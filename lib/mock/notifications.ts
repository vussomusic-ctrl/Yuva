// Mock notifications (no DB table yet — no event sources). The screen builds
// these from REAL listings so taps open live detail pages on any database.
// Replace with Supabase `notifications` once events exist.
//
// `time` is language-neutral (clock / date). Type labels are localized in the
// screen; referenced content (titles, previews, names) is NOT translated.

import { Listing } from "./listings";

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

/**
 * Build the mock feed from real listings: price_drop / new_match reference live
 * ids (old price = current +10%, plausible), so taps open real detail pages.
 * The message item stays static (no real conversation to point at — guarded in
 * the screen). With fewer listings, the listing-backed items are simply skipped.
 */
export function buildMockNotifications(listings: Listing[]): AppNotification[] {
  const [a, b, c, d] = listings;
  const out: AppNotification[] = [];
  if (a) out.push({ id: "n1", type: "price_drop", listingId: a.id, oldPrice: Math.round(a.priceAzn * 1.1), newPrice: a.priceAzn, time: "09:12", read: false });
  if (b) out.push({ id: "n2", type: "new_match", listingId: b.id, time: "08:40", read: false });
  out.push({ id: "n3", type: "message", chatId: "c1", peerName: "Rəşad Əliyev", preview: "Saat 18:00 olar?", time: "14:32", read: false });
  if (c) out.push({ id: "n4", type: "price_drop", listingId: c.id, oldPrice: Math.round(c.priceAzn * 1.1), newPrice: c.priceAzn, time: "12.05", read: true });
  if (d) out.push({ id: "n5", type: "new_match", listingId: d.id, time: "11.05", read: true });
  return out;
}

// Bell badge — the mock always carries the (unread) message notification.
// Static by design (mock layer doesn't share read-state with the screen).
export const hasUnreadNotifications = true;
