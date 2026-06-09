// Supabase Storage access for listing photos (bucket: listing-photos, public).
// RN gotcha: Blob/File/FormData upload as 0 bytes on iOS — we upload an
// ArrayBuffer decoded from base64 instead. Path convention {uid}/{listingId}/{i}.jpg
// satisfies the insert_own / delete_own policies (foldername[1] = auth.uid()).

import { decode } from "base64-arraybuffer";
import { supabase } from "../supabase";

const BUCKET = "listing-photos";

/** Upload one compressed JPEG (base64) and return its permanent public URL. */
export async function uploadListingPhoto(
  uid: string,
  listingId: string,
  index: number,
  base64: string,
): Promise<string> {
  const path = `${uid}/${listingId}/${index}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decode(base64), { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Best-effort removal of a listing's files. Used for cleanup on a failed
 * create and on delete (FK cascade drops the DB rows but NOT the Storage
 * objects). Never throws — failure here must not break the caller.
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
