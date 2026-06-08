// Supabase data access for listings. Returns ready-to-use UI types (Listing /
// ListingDetail) via the adapter — screens never see snake_case or raw rows.
// Read functions throw on error so screens can show an error + retry state.

import { supabase } from "../supabase";
import { Listing, ListingDetail } from "../mock/listings";
import {
  ListingRow,
  ListingFormInput,
  rowToListing,
  rowToDetail,
  formToRow,
} from "../adapters/listing";

// One query, cover embedded (no N+1).
const LIST_SELECT = "*, listing_photos(url, sort)";
// Detail also embeds the owner profile for the agent card.
const DETAIL_SELECT =
  "*, listing_photos(url, sort), owner:profiles!listings_owner_id_fkey(full_name, avatar_url, verified)";

/** Active listings, newest first (Home feed + Search). */
export async function fetchFeed(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LIST_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ListingRow[]).map(rowToListing);
}

/** The current user's own listings (My listings) — any status. */
export async function fetchMyListings(ownerId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(LIST_SELECT)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ListingRow[]).map(rowToListing);
}

/** Listings by id (Saved / Notifications previews). Empty input → []. */
export async function fetchListingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("listings")
    .select(LIST_SELECT)
    .in("id", ids);
  if (error) throw error;
  return (data as ListingRow[]).map(rowToListing);
}

/** A single listing with gallery + owner-as-agent. null if not found. */
export async function fetchListingDetail(id: string): Promise<ListingDetail | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToDetail(data as ListingRow);
}

// Outcome of createListing. `step` distinguishes a failed listing insert from a
// failed photos insert (listing created but photos missing) so the UI can show
// the right message instead of swallowing it.
export type CreateListingResult =
  | { ok: true; id: string }
  | { ok: false; step: "listing" | "photos"; id: string | null };

/**
 * Create a listing then its photo rows ("2 inserts", no RPC). If the photos
 * insert fails after the listing was created, returns step:"photos" WITH the
 * new id — the caller surfaces this explicitly (does not pretend it succeeded).
 */
export async function createListing(
  form: ListingFormInput,
  ownerId: string,
  photoUrls: string[],
): Promise<CreateListingResult> {
  const { data, error } = await supabase
    .from("listings")
    .insert(formToRow(form, ownerId))
    .select("id")
    .single();

  if (error || !data) return { ok: false, step: "listing", id: null };
  const id = (data as { id: string }).id;

  if (photoUrls.length > 0) {
    const rows = photoUrls.map((url, i) => ({ listing_id: id, url, sort: i }));
    const { error: photoErr } = await supabase.from("listing_photos").insert(rows);
    if (photoErr) return { ok: false, step: "photos", id };
  }

  return { ok: true, id };
}
