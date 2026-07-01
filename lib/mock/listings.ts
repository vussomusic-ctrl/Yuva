// Listing domain types + display formatters.
// NOTE: the data now lives in Supabase (see lib/api/listings.ts + the
// snake↔camel mapping in lib/adapters/listing.ts). This file is intentionally
// data-free — it only owns the shared `Listing`/`ListingDetail` shapes the UI
// consumes and the small pure formatters. (Filename keeps "mock/" for now to
// avoid a wide import churn; it is no longer mock data.)

import { DealKey } from "../dealTypes";
import { PropertyTypeKey } from "../propertyTypes";
import { BuildKey } from "../buildTypes";
import type { UserRole } from "../auth";
import type { Agency } from "../adapters/agency";

// Time-based promotion tiers (Boost is separate — see bumpsRemaining/lastBumpedAt).
export type PromoTier = "none" | "vip" | "premium";

export type Listing = {
  id: string;
  image: string; // cover (first listing_photos by sort); "" if none
  photos: string[]; // all photo URLs, ordered by sort (for the card swiper)
  photoCount: number; // total photos for this listing (for the card counter)
  priceAzn: number;
  areaM2: number; // 0 for land — land uses landAreaSot instead
  landAreaSot?: number; // land plot size, "sot"; set only for property_type=land
  rooms: number;
  floor?: number;
  floorTotal?: number;
  district: string;
  premium: boolean;
  promoTier: PromoTier;
  status?: "active" | "sold" | "archived" | "moderation"; // optional — from DB row; absent on mock/manual objects
  promotedUntil?: string; // ISO; set while VIP/Premium is active
  bumpsRemaining: number; // purchased boost balance
  lastBumpedAt?: string; // ISO; last manual bump (search freshness)
  ownerId: string;
  ownerPhone: string;
  ownerTelegram?: string; // optional contact handle
  ownerWhatsapp?: string; // optional WhatsApp number
  // Extended premium characteristics (all optional — populated from DB row).
  buildingSeries?: string;
  complexName?: string;
  builtYear?: number;
  material?: string;
  renovation?: string;
  ceilingHeight?: number;
  bathroomType?: string;
  heating?: string;
  garage?: boolean;
  landPurpose?: string;
  utilGas?: boolean;
  utilWater?: boolean;
  utilElectricity?: boolean;
  utilSewage?: boolean;
  roadAccess?: boolean;
  commercialType?: string;
  separateEntrance?: boolean;
  shopfront?: boolean;
  deposit?: number;
  commission?: string; // legacy
  commissionPercent?: number | null;
  commissionNegotiable?: boolean;
  utilitiesIncluded?: boolean;
  kidsAllowed?: boolean;
  petsAllowed?: boolean;
  minTerm?: number;
  prepayment?: number;
  placeId: string;
  metroId?: string;
  dealType: DealKey;
  propertyType: PropertyTypeKey;
  buildType: BuildKey;
  baths: number;
  furnished: boolean;
  mortgage: boolean;
  amenities?: string[]; // amenity keys (lib/amenities); from DB row — used by the amenity filter
  createdAt: string;
  lat: number;
  lng: number;
  // Owner's agency (carried from the embedded row for list cards). is_partner = "verified".
  agencyName?: string | null;
  agencyVerified?: boolean;
  agencyLogo?: string | null;
};

export type Agent = {
  name: string;
  avatar: string;
  verified: boolean;
  phone: string;
  telegram?: string;
  role: UserRole;
  agency: Agency | null;
};

export type ListingDetail = Listing & {
  gallery: string[];
  description: string;
  amenities: string[];
  agent: Agent;
};

export const formatPrice = (azn: number) => `${azn.toLocaleString("en-US")} ₼`;

/** A VIP/Premium promo counts only while it hasn't expired. */
export const isPromoActive = (l: Pick<Listing, "promoTier" | "promotedUntil">): boolean =>
  l.promoTier !== "none" && l.promotedUntil != null && new Date(l.promotedUntil).getTime() > Date.now();

/** A bump "boosted" badge shows for this long after the last manual bump. */
export const BUMP_WINDOW_MS = 72 * 60 * 60 * 1000;

/** Was the listing bumped within the boosted window? */
export const isRecentlyBumped = (l: Pick<Listing, "lastBumpedAt">): boolean =>
  !!l.lastBumpedAt && Date.now() - new Date(l.lastBumpedAt).getTime() < BUMP_WINDOW_MS;

// Area string with the correct unit per property type: land → "sot", else m².
// Used everywhere area is shown (cards, detail, map preview, title) so land
// never renders a misleading "0 m²".
export const formatArea = (
  l: Pick<Listing, "propertyType" | "areaM2" | "landAreaSot">,
  t: (k: string) => string,
) =>
  l.propertyType === "land"
    ? `${l.landAreaSot ?? 0} ${t("listingTitle.sotUnit")}`
    : `${l.areaM2} ${t("listingTitle.areaUnit")}`;
