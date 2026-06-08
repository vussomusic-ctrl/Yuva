// Supabase data access for favorites (saved listings). All ops are scoped to
// the current user by the `favorites_own` RLS policy. Functions throw on error
// so the store can roll back its optimistic update.

import { supabase } from "../supabase";

/** The listing ids the user has saved. */
export async function fetchFavoriteIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data as { listing_id: string }[]).map((r) => r.listing_id);
}

/** Save a listing. Idempotent: upsert ignores the (user_id, listing_id) PK conflict. */
export async function addFavorite(userId: string, listingId: string): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .upsert(
      { user_id: userId, listing_id: listingId },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

/** Unsave a listing. Idempotent: deleting an absent row is a no-op. */
export async function removeFavorite(userId: string, listingId: string): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);
  if (error) throw error;
}
