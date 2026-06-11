// Supabase data access for agencies (catalog + agency page). Returns UI types
// via the adapters; screens never see snake_case. Reads throw on error.

import { supabase } from "../supabase";
import { Agency, AgencyRow, rowToAgency } from "../adapters/agency";
import { Listing } from "../mock/listings";
import { ListingRow, rowToListing } from "../adapters/listing";

/** An agency's agent (for the "Agents" section). */
export type AgencyAgent = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  verified: boolean;
};

/** Partner agencies for the catalog, alphabetical. */
export async function fetchPartnerAgencies(): Promise<Agency[]> {
  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("is_partner", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as AgencyRow[]).map(rowToAgency);
}

/** One agency by id, or null if not found. */
export async function fetchAgencyById(id: string): Promise<Agency | null> {
  const { data, error } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToAgency(data as AgencyRow) : null;
}

/** Agents that belong to this agency (role = 'agent'), by name. */
export async function fetchAgencyAgents(agencyId: string): Promise<AgencyAgent[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, verified")
    .eq("agency_id", agencyId)
    .eq("role", "agent")
    .order("full_name", { ascending: true });
  if (error) throw error;
  const rows =
    (data as { id: string; full_name: string | null; avatar_url: string | null; verified: boolean }[]) ?? [];
  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    avatarUrl: r.avatar_url,
    verified: r.verified,
  }));
}

/**
 * Active listings of this agency's agents. One query: !inner embed on the owner
 * profile filtered by agency_id. Same status + ordering as fetchFeed (active,
 * newest first) for consistent list behaviour.
 */
export async function fetchAgencyListings(agencyId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_photos(id, url, sort), owner:profiles!listings_owner_id_fkey!inner(agency_id)")
    .eq("owner.agency_id", agencyId)
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ListingRow[]).map(rowToListing);
}
