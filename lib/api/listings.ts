// Supabase data access for listings. Returns ready-to-use UI types (Listing /
// ListingDetail) via the adapter — screens never see snake_case or raw rows.
// Read functions throw on error so screens can show an error + retry state.

import { supabase } from "../supabase";
import { Listing, ListingDetail } from "../mock/listings";
import {
  ListingRow,
  ListingFormInput,
  PhotoItem,
  rowToListing,
  rowToDetail,
  formToRow,
} from "../adapters/listing";
import {
  uploadListingPhoto,
  removeListingFiles,
  removePhotoFiles,
  storagePathFromUrl,
} from "./photos";

// One query, cover embedded (no N+1).
const LIST_SELECT = "*, listing_photos(id, url, sort)";
// Detail also embeds the owner profile for the agent card.
const DETAIL_SELECT =
  "*, listing_photos(id, url, sort), owner:profiles!listings_owner_id_fkey(full_name, avatar_url, verified, role)";

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

/** Raw row (with photos) for edit prefill — keeps null/0 the domain type loses. */
export async function fetchListingRow(id: string): Promise<ListingRow | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LIST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ListingRow) ?? null;
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
 * Create a listing with real photos (listing-first). Order:
 *   1. insert listing → id (nothing uploaded yet → no orphans if this fails)
 *   2. upload each compressed JPEG to {uid}/{id}/{i}.jpg → public URL
 *   3. insert listing_photos rows with those URLs
 * Any photo-stage failure does a FULL rollback (remove files + delete listing)
 * and returns step:"photos" — never a coverless half-listing. Storage isn't
 * transactional with Postgres, so rollback is best-effort.
 */
export async function createListing(
  form: ListingFormInput,
  ownerId: string,
  photos: { base64: string }[],
): Promise<CreateListingResult> {
  const { data, error } = await supabase
    .from("listings")
    .insert(formToRow(form, ownerId))
    .select("id")
    .single();

  if (error || !data) return { ok: false, step: "listing", id: null };
  const id = (data as { id: string }).id;

  // 2. Upload files.
  const urls: string[] = [];
  try {
    for (let i = 0; i < photos.length; i++) {
      urls.push(await uploadListingPhoto(ownerId, id, `${i}.jpg`, photos[i].base64));
    }
  } catch {
    await removeListingFiles(ownerId, id);
    await deleteListing(id, ownerId);
    return { ok: false, step: "photos", id };
  }

  // 3. Insert photo rows.
  if (urls.length > 0) {
    const rows = urls.map((url, i) => ({ listing_id: id, url, sort: i }));
    const { error: photoErr } = await supabase.from("listing_photos").insert(rows);
    if (photoErr) {
      await removeListingFiles(ownerId, id);
      await deleteListing(id, ownerId);
      return { ok: false, step: "photos", id };
    }
  }

  return { ok: true, id };
}

/**
 * Update a listing the user owns. Payload = formToRow MINUS owner_id (never
 * reassign the owner; RLS would block it anyway). Columns not in the payload
 * (status/premium/views_count/has_deed/currency/amenities/created_at) are
 * preserved; updated_at is bumped by the DB trigger. Photos are NOT touched.
 * RLS: listings_update_own. Errors caught into { ok: false }.
 */
export async function updateListing(
  id: string,
  form: ListingFormInput,
  ownerId: string,
  photos: PhotoItem[],
): Promise<{ ok: true } | { ok: false; step: "fields" | "photos" }> {
  // Step 0 — listings fields. Fail before touching Storage → no orphans.
  const { owner_id, ...patch } = formToRow(form, "");
  const { error: fieldErr } = await supabase.from("listings").update(patch).eq("id", id);
  if (fieldErr) return { ok: false, step: "fields" };

  // Re-read current photo rows (source of truth for removed detection + paths).
  const { data: currentRows, error: readErr } = await supabase
    .from("listing_photos")
    .select("id, url")
    .eq("listing_id", id);
  if (readErr) return { ok: false, step: "photos" };
  const current = (currentRows ?? []) as { id: string; url: string }[];

  // Diff by rowId.
  const keptIds = new Set(
    photos.filter((p) => p.kind === "existing" && p.rowId).map((p) => p.rowId as string),
  );
  const removed = current.filter((r) => !keptIds.has(r.id));

  // sort for both kept and new = the item's index in the final array (one dense
  // 0..n-1 sequence, existing + new interleaved by array order).
  const uploadedPaths: string[] = [];
  const newUrls = new Map<number, string>(); // final index → uploaded url

  // Steps 1-3 are the "savable" zone: any failure → clean THIS attempt's files
  // (uploadedPaths) and bail. Storage isn't transactional, so we roll back files.
  try {
    // 1. Upload new files (token name, not position-based).
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (p.kind === "new") {
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
        const url = await uploadListingPhoto(ownerId, id, fileName, p.base64 ?? "");
        uploadedPaths.push(`${ownerId}/${id}/${fileName}`);
        newUrls.set(i, url);
      }
    }
    // 2. Update sort on kept rows (by rowId).
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (p.kind === "existing" && p.rowId) {
        const { error } = await supabase.from("listing_photos").update({ sort: i }).eq("id", p.rowId);
        if (error) throw error;
      }
    }
    // 3. Insert new rows.
    const insertRows = photos
      .map((p, i) => (p.kind === "new" ? { listing_id: id, url: newUrls.get(i)!, sort: i } : null))
      .filter((r): r is { listing_id: string; url: string; sort: number } => r !== null);
    if (insertRows.length > 0) {
      const { error } = await supabase.from("listing_photos").insert(insertRows);
      if (error) throw error;
    }
  } catch {
    await removePhotoFiles(uploadedPaths);
    return { ok: false, step: "photos" };
  }

  // 4. Delete removed rows — BEST-EFFORT (main change already saved; don't fail
  // even on a thrown network error).
  if (removed.length > 0) {
    try {
      await supabase
        .from("listing_photos")
        .delete()
        .in(
          "id",
          removed.map((r) => r.id),
        );
    } catch {
      // swallow — removed rows clean up on the next Save / GC
    }
  }
  // 5. Delete removed files — BEST-EFFORT, last (a row never points at a gone file).
  await removePhotoFiles(removed.map((r) => storagePathFromUrl(r.url)));

  return { ok: true };
}

/**
 * Delete a listing the user owns. The FK ON DELETE CASCADE removes its
 * listing_photos + favorites ROWS, but NOT the Storage files — those must be
 * removed via the Storage API or they orphan. So after deleting the row we
 * best-effort remove the listing's files. RLS: listings_delete_own.
 */
export async function deleteListing(id: string, ownerId?: string): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) return { ok: false };
  if (ownerId) await removeListingFiles(ownerId, id);
  return { ok: true };
}
