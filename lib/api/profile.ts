// Supabase writes for the current user's profile (name, account type, avatar).
// Reads live in lib/auth (AuthProvider.loadProfile); these are the mutations.
// RN gotcha (same as listing photos): upload an ArrayBuffer decoded from base64,
// not a Blob/File — those upload as 0 bytes on iOS.

import { decode } from "base64-arraybuffer";
import { supabase } from "../supabase";
import type { UserRole } from "../auth";

const AVATARS_BUCKET = "avatars";

/**
 * Update my profile row — only the fields passed (undefined keys are dropped by
 * JSON.stringify, so omitted fields stay untouched). RLS profiles_update_own
 * scopes the write to my own row.
 */
export async function updateProfile(fields: {
  full_name?: string;
  role?: UserRole;
  avatar_url?: string | null;
}): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error("not authenticated");
  const { error } = await supabase.from("profiles").update(fields).eq("id", uid);
  if (error) throw error;
}

/**
 * Upload a compressed avatar JPEG (base64) → public URL. Path {uid}/{ts}.jpg
 * satisfies the avatars_insert_own policy (foldername[1] = auth.uid()). The ts
 * makes each upload a fresh object (no upsert needed; old file left best-effort).
 */
export async function uploadAvatar(uid: string, base64: string): Promise<string> {
  const path = `${uid}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, decode(base64), { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path).data.publicUrl;
}
