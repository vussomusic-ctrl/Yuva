// Supabase Storage access for listing photos (bucket: listing-photos, public).
// RN gotcha: Blob/File/FormData upload as 0 bytes on iOS — we upload an
// ArrayBuffer decoded from base64 instead. Path convention {uid}/{listingId}/{name}
// satisfies the insert_own / delete_own policies (foldername[1] = auth.uid()).

import { decode } from "base64-arraybuffer";
import { supabase } from "../supabase";

const BUCKET = "listing-photos";
const PUBLIC_MARKER = "/object/public/listing-photos/";

/** Upload one compressed JPEG (base64) under a caller-chosen file name. */
export async function uploadListingPhoto(
  uid: string,
  listingId: string,
  fileName: string,
  base64: string,
): Promise<string> {
  const path = `${uid}/${listingId}/${fileName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Best-effort removal of a whole listing folder ({uid}/{listingId}). Used for
 * create-rollback and on deleteListing. Never throws.
 */
export async function removeListingFiles(uid: string, listingId: string): Promise<void> {
  try {
    const prefix = `${uid}/${listingId}`;
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix);
    if (error || !data || data.length === 0) return;
    const paths = data.map((f) => `${prefix}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  } catch {
    // swallow — cleanup is best-effort
  }
}

/**
 * Best-effort removal of specific files by path (not a whole folder). Used by
 * edit reconciliation (removed photos / failed-upload cleanup). Skips empty
 * input; never throws.
 */
export async function removePhotoFiles(paths: (string | null | undefined)[]): Promise<void> {
  const clean = paths.filter((p): p is string => !!p);
  if (clean.length === 0) return;
  try {
    await supabase.storage.from(BUCKET).remove(clean);
  } catch {
    // swallow — cleanup is best-effort
  }
}

/**
 * Derive the in-bucket storage path from a public URL produced by getPublicUrl
 * (…/object/public/listing-photos/{uid}/{listingId}/{name}). Returns null on any
 * unexpected format so reconciliation never crashes on a malformed URL (the
 * file is then left in place — an orphan beats a crash).
 */
export function storagePathFromUrl(url: string): string | null {
  const i = url.indexOf(PUBLIC_MARKER);
  if (i === -1) return null;
  const path = url.slice(i + PUBLIC_MARKER.length);
  return path.length > 0 ? path : null;
}
