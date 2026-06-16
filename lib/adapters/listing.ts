// The ONLY place that knows about snake_case DB columns. UI stays camelCase.
// rowToListing / rowToDetail: DB row → UI `Listing`/`ListingDetail`.
// formToRow: Add Listing form → insert payload for the `listings` table.

import { DealKey } from "../dealTypes";
import { PropertyTypeKey, isLandType } from "../propertyTypes";
import { BuildKey } from "../buildTypes";
import { Listing, ListingDetail, Agent } from "../mock/listings";
import { storagePathFromUrl } from "../api/photos";
import type { UserRole } from "../auth";
import { rowToAgency, AgencyRow } from "./agency";

// --- DB row shapes (what PostgREST returns with our embeds) ---

export type ListingPhotoRow = { id: string; url: string; sort: number };

export type OwnerRow = {
  full_name: string | null;
  avatar_url: string | null;
  verified: boolean;
  role: UserRole | null;
  agency: AgencyRow | null;
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
  contact_telegram: string | null;
  contact_whatsapp: string | null;
  // Extended characteristics (apartment / house)
  building_series: string | null;
  complex_name: string | null;
  built_year: number | null;
  material: string | null;
  renovation: string | null;
  ceiling_height: number | null;
  bathroom_type: string | null;
  heating: string | null;
  garage: boolean;
  // Land
  land_purpose: string | null;
  util_gas: boolean;
  util_water: boolean;
  util_electricity: boolean;
  util_sewage: boolean;
  road_access: boolean;
  // Commercial
  commercial_type: string | null;
  separate_entrance: boolean;
  shopfront: boolean;
  // Rent terms
  deposit: number | null;
  commission: string | null; // legacy
  commission_percent: number | null;
  commission_negotiable: boolean;
  utilities_included: boolean;
  kids_allowed: boolean;
  pets_allowed: boolean;
  min_term: number | null;
  prepayment: number | null;
  premium: boolean;
  promo_tier: "none" | "vip" | "premium";
  promoted_until: string | null;
  bumps_remaining: number;
  last_bumped_at: string | null;
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
  telegram: string;
  whatsapp: string;
  furnished: boolean;
  mortgage: boolean;
  description: string;
  lat: number | null;
  lng: number | null;
  // Characteristics (step 5) — numeric kept as strings; enums string | null.
  buildingSeries?: string | null;
  complexName?: string;
  builtYear?: string;
  material?: string | null;
  renovation?: string | null;
  heating?: string | null;
  // Land
  landPurpose?: string | null;
  utilGas?: boolean;
  utilWater?: boolean;
  utilElectricity?: boolean;
  utilSewage?: boolean;
  roadAccess?: boolean;
  // Commercial
  commercialType?: string | null;
  separateEntrance?: boolean;
  shopfront?: boolean;
  // Rent terms (deposit/minTerm/prepayment kept as strings like price)
  deposit?: string;
  commissionPercent?: string;
  commissionNegotiable?: boolean;
  utilitiesIncluded?: boolean;
  kidsAllowed?: boolean;
  petsAllowed?: boolean;
  minTerm?: string;
  prepayment?: string;
};

// Form photo item. `existing` = already in DB (rowId + storagePath); `new` =
// freshly picked (base64 to upload). `uri` is the preview source for both.
export type PhotoItem = {
  uri: string;
  base64?: string;
  rowId?: string;
  storagePath?: string;
  kind: "existing" | "new";
};

// Photos sorted by `sort`; cover = first url (or "" if none).
function sortedPhotoUrls(photos?: ListingPhotoRow[] | null): string[] {
  if (!photos || photos.length === 0) return [];
  return [...photos].sort((a, b) => a.sort - b.sort).map((p) => p.url);
}

export function rowToListing(row: ListingRow): Listing {
  const urls = sortedPhotoUrls(row.listing_photos);
  const l: Listing = {
    id: row.id,
    image: urls[0] ?? "",
    photos: urls,
    photoCount: urls.length,
    priceAzn: row.price_azn,
    areaM2: row.area_m2 ?? 0,
    landAreaSot: row.land_area_sot ?? undefined,
    rooms: row.rooms ?? 0,
    floor: row.floor ?? undefined,
    floorTotal: row.floor_total ?? undefined,
    district: row.district ?? "",
    premium: row.premium,
    promoTier: row.promo_tier ?? "none",
    promotedUntil: row.promoted_until ?? undefined,
    bumpsRemaining: row.bumps_remaining ?? 0,
    lastBumpedAt: row.last_bumped_at ?? undefined,
    ownerId: row.owner_id,
    ownerPhone: row.contact_phone ?? "",
    ownerTelegram: row.contact_telegram ?? "",
    ownerWhatsapp: row.contact_whatsapp ?? "",
    placeId: row.place_id ?? "",
    metroId: row.metro_id ?? undefined,
    dealType: row.deal_type,
    propertyType: row.property_type,
    buildType: row.build_type ?? "new",
    baths: row.baths ?? 0,
    furnished: row.furnished,
    mortgage: row.mortgage,
    buildingSeries: row.building_series ?? undefined,
    complexName: row.complex_name ?? undefined,
    builtYear: row.built_year ?? undefined,
    material: row.material ?? undefined,
    renovation: row.renovation ?? undefined,
    ceilingHeight: row.ceiling_height ?? undefined,
    bathroomType: row.bathroom_type ?? undefined,
    heating: row.heating ?? undefined,
    garage: row.garage ?? false,
    landPurpose: row.land_purpose ?? undefined,
    utilGas: row.util_gas ?? false,
    utilWater: row.util_water ?? false,
    utilElectricity: row.util_electricity ?? false,
    utilSewage: row.util_sewage ?? false,
    roadAccess: row.road_access ?? false,
    commercialType: row.commercial_type ?? undefined,
    separateEntrance: row.separate_entrance ?? false,
    shopfront: row.shopfront ?? false,
    deposit: row.deposit ?? undefined,
    commission: row.commission ?? undefined,
    commissionPercent: row.commission_percent ?? undefined,
    commissionNegotiable: row.commission_negotiable ?? false,
    utilitiesIncluded: row.utilities_included ?? false,
    kidsAllowed: row.kids_allowed ?? false,
    petsAllowed: row.pets_allowed ?? false,
    minTerm: row.min_term ?? undefined,
    prepayment: row.prepayment ?? undefined,
    createdAt: row.created_at,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
  };
  return l;
}

const FALLBACK_AGENT: Agent = { name: "Yuva", avatar: "", verified: false, phone: "", telegram: "", role: "user", agency: null };

export function rowToDetail(row: ListingRow): ListingDetail {
  const base = rowToListing(row);
  const gallery = sortedPhotoUrls(row.listing_photos);
  const agent: Agent = row.owner
    ? {
        name: row.owner.full_name ?? "",
        avatar: row.owner.avatar_url ?? "",
        verified: row.owner.verified,
        phone: row.contact_phone ?? "",
        telegram: row.contact_telegram ?? "",
        role: row.owner.role ?? "user",
        agency: row.owner.agency ? rowToAgency(row.owner.agency) : null,
      }
    : { ...FALLBACK_AGENT, phone: row.contact_phone ?? "", telegram: row.contact_telegram ?? "" };
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
  const isLand = isLandType(form.propertyType);
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
    // Characteristics (gated per property type in the form; written as-is).
    building_series: form.buildingSeries ?? null,
    complex_name: form.complexName ?? null,
    built_year: form.builtYear ? Number(form.builtYear) : null,
    material: form.material ?? null,
    renovation: form.renovation ?? null,
    heating: form.heating ?? null,
    // Land
    land_purpose: form.landPurpose ?? null,
    util_gas: form.utilGas ?? false,
    util_water: form.utilWater ?? false,
    util_electricity: form.utilElectricity ?? false,
    util_sewage: form.utilSewage ?? false,
    road_access: form.roadAccess ?? false,
    // Commercial
    commercial_type: form.commercialType ?? null,
    separate_entrance: form.separateEntrance ?? false,
    shopfront: form.shopfront ?? false,
    // Rent terms
    deposit: form.deposit ? Number(form.deposit) : null,
    commission: null, // legacy — replaced by percent + negotiable
    commission_percent: form.commissionPercent ? Number(form.commissionPercent) : null,
    commission_negotiable: form.commissionNegotiable ?? false,
    utilities_included: form.utilitiesIncluded ?? false,
    kids_allowed: form.kidsAllowed ?? false,
    pets_allowed: form.petsAllowed ?? false,
    min_term: form.minTerm ? Number(form.minTerm) : null,
    prepayment: form.prepayment ? Number(form.prepayment) : null,
    contact_phone: form.phone.trim(),
    contact_telegram: form.telegram.trim() || null,
    contact_whatsapp: form.whatsapp.trim() || null,
    contact_type: "owner" as const,
  };
}

// DB row → form fields (edit prefill). Reads the RAW row to keep the null/0
// distinction the domain `Listing` loses. Mirror image of formToRow — same land
// branch via isLandType so the area column round-trips faithfully. Does NOT
// touch photos (they aren't part of ListingFormInput; seeded separately).
export function rowToForm(row: ListingRow): ListingFormInput {
  const isLand = isLandType(row.property_type);
  const numStr = (n: number | null) => (n == null ? "" : String(n));
  return {
    dealType: row.deal_type,
    propertyType: row.property_type,
    buildType: row.build_type ?? "new",
    price: numStr(row.price_azn),
    area: numStr(isLand ? row.land_area_sot : row.area_m2),
    rooms: numStr(row.rooms),
    baths: numStr(row.baths),
    floor: numStr(row.floor),
    floorTotal: numStr(row.floor_total),
    placeId: row.place_id ?? null,
    metroId: row.metro_id ?? null,
    district: row.district ?? "",
    phone: row.contact_phone ?? "",
    telegram: row.contact_telegram ?? "",
    whatsapp: row.contact_whatsapp ?? "",
    furnished: row.furnished,
    mortgage: row.mortgage,
    description: row.description ?? "",
    lat: row.lat,
    lng: row.lng,
    buildingSeries: row.building_series,
    complexName: row.complex_name ?? "",
    builtYear: row.built_year != null ? String(row.built_year) : "",
    material: row.material,
    renovation: row.renovation,
    heating: row.heating,
    landPurpose: row.land_purpose,
    utilGas: row.util_gas ?? false,
    utilWater: row.util_water ?? false,
    utilElectricity: row.util_electricity ?? false,
    utilSewage: row.util_sewage ?? false,
    roadAccess: row.road_access ?? false,
    commercialType: row.commercial_type,
    separateEntrance: row.separate_entrance ?? false,
    shopfront: row.shopfront ?? false,
    deposit: row.deposit != null ? String(row.deposit) : "",
    commissionPercent: row.commission_percent != null ? String(row.commission_percent) : "",
    commissionNegotiable: row.commission_negotiable ?? false,
    utilitiesIncluded: row.utilities_included ?? false,
    kidsAllowed: row.kids_allowed ?? false,
    petsAllowed: row.pets_allowed ?? false,
    minTerm: row.min_term != null ? String(row.min_term) : "",
    prepayment: row.prepayment != null ? String(row.prepayment) : "",
  };
}

// DB row → edit-prefill photo items (existing photos, ordered by sort). Each
// carries its rowId (for diff/sort on Save) and parsed storagePath.
export function rowToPhotoItems(row: ListingRow): PhotoItem[] {
  return (row.listing_photos ?? [])
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((p) => ({
      uri: p.url,
      rowId: p.id,
      storagePath: storagePathFromUrl(p.url) ?? undefined,
      kind: "existing" as const,
    }));
}
