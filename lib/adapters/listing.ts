// The ONLY place that knows about snake_case DB columns. UI stays camelCase.
// rowToListing / rowToDetail: DB row → UI `Listing`/`ListingDetail`.
// formToRow: Add Listing form → insert payload for the `listings` table.

import { DealKey } from "../dealTypes";
import { PropertyTypeKey } from "../propertyTypes";
import { BuildKey } from "../buildTypes";
import { Listing, ListingDetail, Agent } from "../mock/listings";

// --- DB row shapes (what PostgREST returns with our embeds) ---

export type ListingPhotoRow = { url: string; sort: number };

export type OwnerRow = {
  full_name: string | null;
  avatar_url: string | null;
  verified: boolean;
};

export type ListingRow = {
  id: string;
  owner_id: string;
  deal_type: DealKey;
  property_type: PropertyTypeKey;
  build_type: BuildKey | null;
  price_azn: number;
  area_m2: number | null;
  land_area_sot: number | null;
  rooms: number | null;
  baths: number | null;
  floor: number | null;
  floor_total: number | null;
  place_id: string | null;
  metro_id: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  furnished: boolean;
  mortgage: boolean;
  description: string | null;
  amenities: string[] | null;
  contact_phone: string | null;
  premium: boolean;
  created_at: string;
  // Embedded relations (optional depending on the query's select).
  listing_photos?: ListingPhotoRow[] | null;
  owner?: OwnerRow | null;
};

// --- Add Listing form payload (camelCase, collected by the screen) ---

export type ListingFormInput = {
  dealType: DealKey;
  propertyType: PropertyTypeKey;
  buildType: BuildKey;
  price: string;
  area: string;
  rooms: string;
  baths: string;
  floor: string;
  floorTotal: string;
  placeId: string | null;
  metroId: string | null;
  district: string;
  phone: string;
  furnished: boolean;
  mortgage: boolean;
  description: string;
  lat: number | null;
  lng: number | null;
};

// Photos sorted by `sort`; cover = first url (or "" if none).
function sortedPhotoUrls(photos?: ListingPhotoRow[] | null): string[] {
  if (!photos || photos.length === 0) return [];
  return [...photos].sort((a, b) => a.sort - b.sort).map((p) => p.url);
}

export function rowToListing(row: ListingRow): Listing {
  const urls = sortedPhotoUrls(row.listing_photos);
  return {
    id: row.id,
    image: urls[0] ?? "",
    priceAzn: row.price_azn,
    areaM2: row.area_m2 ?? 0,
    landAreaSot: row.land_area_sot ?? undefined,
    rooms: row.rooms ?? 0,
    floor: row.floor ?? undefined,
    floorTotal: row.floor_total ?? undefined,
    district: row.district ?? "",
    premium: row.premium,
    ownerId: row.owner_id,
    ownerPhone: row.contact_phone ?? "",
    placeId: row.place_id ?? "",
    metroId: row.metro_id ?? undefined,
    dealType: row.deal_type,
    propertyType: row.property_type,
    buildType: row.build_type ?? "new",
    baths: row.baths ?? 0,
    furnished: row.furnished,
    mortgage: row.mortgage,
    createdAt: row.created_at,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
  };
}

const FALLBACK_AGENT: Agent = { name: "Yuva", avatar: "", verified: false, phone: "" };

export function rowToDetail(row: ListingRow): ListingDetail {
  const base = rowToListing(row);
  const gallery = sortedPhotoUrls(row.listing_photos);
  const agent: Agent = row.owner
    ? {
        name: row.owner.full_name ?? "",
        avatar: row.owner.avatar_url ?? "",
        verified: row.owner.verified,
        phone: row.contact_phone ?? "",
      }
    : { ...FALLBACK_AGENT, phone: row.contact_phone ?? "" };
  return {
    ...base,
    gallery,
    description: row.description ?? "",
    amenities: row.amenities ?? [],
    agent,
  };
}

// Parse a numeric form string → number, or null when empty (never 0 for
// optional fields). Required numerics (price/area) are validated upstream.
const num = (s: string): number | null => {
  const v = s.trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Form → `listings` insert payload. owner_id from the auth session.
// Columns with DB defaults (currency/status/premium/views_count/has_deed/
// amenities/created_at/updated_at) are intentionally omitted.
export function formToRow(form: ListingFormInput, ownerId: string) {
  const isLand = form.propertyType === "land";
  const area = num(form.area);
  return {
    owner_id: ownerId,
    deal_type: form.dealType,
    property_type: form.propertyType,
    build_type: isLand ? null : form.buildType,
    price_azn: num(form.price) ?? 0,
    area_m2: isLand ? null : area,
    land_area_sot: isLand ? area : null,
    rooms: isLand ? null : num(form.rooms),
    baths: isLand ? null : num(form.baths),
    floor: isLand ? null : num(form.floor),
    floor_total: isLand ? null : num(form.floorTotal),
    place_id: form.placeId ?? null,
    metro_id: form.metroId ?? null,
    district: form.district || null,
    lat: form.lat ?? null,
    lng: form.lng ?? null,
    furnished: isLand ? false : form.furnished,
    mortgage: form.mortgage,
    description: form.description.trim() || null,
    contact_phone: form.phone.trim(),
    contact_type: "owner" as const,
  };
}
