// Supabase data access for listing views (browsing history → "You viewed" mark).
// All ops are scoped to the current user by the `listing_views_own` RLS policy.
// Functions throw on error so callers can handle/swallow as needed.

import { supabase } from "../supabase";

/**
 * recordView — mark that the user opened a listing (the "You viewed" mark).
 * Upsert: re-opening refreshes viewed_at. Idempotent.
 */
export async function recordView(userId: string, listingId: string): Promise<void> {
  const { error } = await supabase
    .from("listing_views")
    .upsert(
      { user_id: userId, listing_id: listingId, viewed_at: new Date().toISOString() },
      { onConflict: "user_id,listing_id" }, // no ignoreDuplicates → viewed_at is refreshed
    );
  if (error) throw error;
}

/** The listing ids the user has already viewed (for the search badge). */
export async function fetchViewedIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("listing_views")
    .select("listing_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as { listing_id: string }[]).map((r) => r.listing_id);
}
