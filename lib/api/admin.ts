// Admin-only data access for managing agencies + their agents. Every write here
// is gated server-side by RLS (is_admin() / agencies_admin_write /
// profiles_update_admin / agency_logos_admin_write) — the client just calls.
// RN gotcha (same as photos/avatars): upload an ArrayBuffer decoded from base64.

import { decode } from "base64-arraybuffer";
import { supabase } from "../supabase";
import { Agency, AgencyRow, rowToAgency } from "../adapters/agency";

const AGENCY_LOGOS_BUCKET = "agency-logos";

/** All agencies (admin list), alphabetical — incl. non-partner. */
export async function fetchAllAgencies(): Promise<Agency[]> {
  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as AgencyRow[]).map(rowToAgency);
}

/** Create an agency with just a name; returns it (then edit in the [id] screen). */
export async function createAgency(name: string): Promise<Agency> {
  const { data, error } = await supabase
    .from("agencies")
    .insert({ name: name.trim() })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("create agency failed");
  return rowToAgency(data as AgencyRow);
}

// camelCase patch from the editor; mapped to snake columns here (adapter rule).
export type AgencyUpdate = {
  name?: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  isPartner?: boolean;
};

/** Update an agency — only the passed fields. */
export async function updateAgency(id: string, fields: AgencyUpdate): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (fields.name !== undefined) payload.name = fields.name.trim();
  if (fields.phone !== undefined) payload.phone = fields.phone;
  if (fields.email !== undefined) payload.email = fields.email;
  if (fields.website !== undefined) payload.website = fields.website;
  if (fields.logoUrl !== undefined) payload.logo_url = fields.logoUrl;
  if (fields.isPartner !== undefined) payload.is_partner = fields.isPartner;
  const { error } = await supabase.from("agencies").update(payload).eq("id", id);
  if (error) throw error;
}

/** Upload a compressed logo JPEG (base64) → public URL. Path {agencyId}/{ts}.jpg. */
export async function uploadAgencyLogo(agencyId: string, base64: string): Promise<string> {
  const path = `${agencyId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(AGENCY_LOGOS_BUCKET)
    .upload(path, decode(base64), { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return supabase.storage.from(AGENCY_LOGOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Bind/unbind a profile to an agency. Keeps role in sync: binding → 'agent',
 * unbinding (agencyId = null) → 'user'. RLS profiles_update_admin allows the
 * admin to update other people's rows.
 */
export async function setAgentAgency(profileId: string, agencyId: string | null): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ agency_id: agencyId, role: agencyId ? "agent" : "user" })
    .eq("id", profileId);
  if (error) throw error;
}

/** A profile found while searching for an agent to bind. */
export type SearchedProfile = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  agencyId: string | null;
};

/** Search profiles by name or phone (for agent binding). <2 chars → []. */
export async function searchProfiles(query: string): Promise<SearchedProfile[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, phone, agency_id")
    // quote the patterns so spaces/commas in the value don't break the or-filter
    .or(`full_name.ilike."${like}",phone.ilike."${like}"`)
    .limit(20);
  if (error) throw error;
  const rows =
    (data as {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      phone: string | null;
      agency_id: string | null;
    }[]) ?? [];
  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    avatarUrl: r.avatar_url,
    phone: r.phone,
    agencyId: r.agency_id,
  }));
}
