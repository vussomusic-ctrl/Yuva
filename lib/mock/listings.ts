// Mock listings for the Home Feed. Replace with Supabase `listings` query later.
// Titles/districts are user-generated content (Azerbaijani) — not translated.

import { DealKey } from "../dealTypes";
import { PropertyTypeKey } from "../propertyTypes";
import { BuildKey } from "../buildTypes";

export type Listing = {
  id: string;
  image: string;
  priceAzn: number;
  areaM2: number;
  rooms: number;
  floor?: number;
  floorTotal?: number;
  district: string;
  premium: boolean;
  // Owner of the listing. Matches currentUser.id ("u1") for the user's own
  // listings; other ids belong to other (mock) sellers.
  ownerId: string;
  // Seller phone, "+994XXXXXXXXX" — drives Call / WhatsApp on Property Detail.
  ownerPhone: string;
  // Place reference (lib/places.ts). `placeId` powers the region filter + coords;
  // `metroId` (optional) powers the metro filter. `district` stays a display string.
  placeId: string;
  metroId?: string;
  // Faceted attributes used by Search filters.
  dealType: DealKey;
  propertyType: PropertyTypeKey;
  buildType: BuildKey;
  baths: number;
  furnished: boolean;
  mortgage: boolean;
  // ISO date — drives "newest first" sort.
  createdAt: string;
  // Map coordinates (Baku). Used by Search — Map price pins.
  lat: number;
  lng: number;
};

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&q=70`;

export const listings: Listing[] = [
  {
    id: "1",
    image: img("1502672260266-1c1ef2d93688"),
    priceAzn: 245000,
    areaM2: 95,
    rooms: 3,
    floor: 7,
    floorTotal: 16,
    district: "Nizami rayonu",
    placeId: "nizami_rayon",
    metroId: "nizami_metro",
    lat: 40.379,
    lng: 49.949,
    premium: true,
    ownerId: "u2",
    ownerPhone: "+994501234567",
    dealType: "sale",
    propertyType: "apartment",
    buildType: "secondary",
    baths: 2,
    furnished: true,
    mortgage: true,
    createdAt: "2026-05-20T10:00:00Z",
  },
  {
    id: "2",
    image: img("1512917774080-9991f1c4c750"),
    priceAzn: 420000,
    areaM2: 210,
    rooms: 5,
    district: "Xəzər rayonu",
    placeId: "xezer_rayon",
    lat: 40.422,
    lng: 50.048,
    premium: true,
    ownerId: "u1",
    ownerPhone: "+994552345678",
    dealType: "sale",
    propertyType: "house",
    buildType: "new",
    baths: 4,
    furnished: false,
    mortgage: false,
    createdAt: "2026-06-01T10:00:00Z",
  },
  {
    id: "3",
    image: img("1493809842364-78817add7ffb"),
    priceAzn: 178000,
    areaM2: 72,
    rooms: 2,
    floor: 3,
    floorTotal: 9,
    district: "Yasamal rayonu",
    placeId: "yasamal_rayon",
    metroId: "elmler_akademiyasi_metro",
    lat: 40.378,
    lng: 49.815,
    premium: true,
    ownerId: "u3",
    ownerPhone: "+994703456789",
    dealType: "sale",
    propertyType: "apartment",
    buildType: "secondary",
    baths: 1,
    furnished: true,
    mortgage: false,
    createdAt: "2026-04-15T10:00:00Z",
  },
  {
    id: "4",
    image: img("1560448204-e02f11c3d0e2"),
    priceAzn: 1400,
    areaM2: 65,
    rooms: 2,
    floor: 4,
    floorTotal: 12,
    district: "28 May metrosu yaxınlığında",
    placeId: "nesimi_rayon",
    metroId: "28_may_metro",
    lat: 40.379,
    lng: 49.849,
    premium: false,
    ownerId: "u4",
    ownerPhone: "+994774567890",
    dealType: "rent",
    propertyType: "apartment",
    buildType: "secondary",
    baths: 1,
    furnished: true,
    mortgage: false,
    createdAt: "2026-06-04T10:00:00Z",
  },
  {
    id: "5",
    image: img("1568605114967-8130f3a36994"),
    priceAzn: 320000,
    areaM2: 140,
    rooms: 4,
    district: "Abşeron, Mərdəkan",
    placeId: "merdekan_q",
    lat: 40.49,
    lng: 50.13,
    premium: false,
    ownerId: "u1",
    ownerPhone: "+994505678901",
    dealType: "sale",
    propertyType: "house",
    buildType: "new",
    baths: 3,
    furnished: false,
    mortgage: true,
    createdAt: "2026-05-02T10:00:00Z",
  },
  {
    id: "6",
    image: img("1586023492125-27b2c045efd7"),
    priceAzn: 850,
    areaM2: 54,
    rooms: 1,
    floor: 9,
    floorTotal: 14,
    district: "Xətai rayonu",
    placeId: "xetai_rayon",
    metroId: "ehmedli_metro",
    lat: 40.394,
    lng: 49.905,
    premium: false,
    ownerId: "u5",
    ownerPhone: "+994556789012",
    dealType: "rent",
    propertyType: "apartment",
    buildType: "new",
    baths: 1,
    furnished: false,
    mortgage: false,
    createdAt: "2026-06-05T10:00:00Z",
  },
];

export const recommendedListings = listings.filter((l) => l.premium);
export const newListings = listings;

export const getListingsByOwner = (ownerId: string) =>
  listings.filter((l) => l.ownerId === ownerId);

export const getListingById = (id: string) => listings.find((l) => l.id === id);

// Add a user-created listing to the in-memory feed (Add Listing flow). Prepends
// so it shows first in My listings / feeds. Lost on reload; persist to Supabase
// `listings` later. Caller supplies ownerId + premium.
export function addListing(input: Omit<Listing, "id">): Listing {
  const created: Listing = { ...input, id: `user-${Date.now()}` };
  listings.unshift(created);
  return created;
}

export const formatPrice = (azn: number) => `${azn.toLocaleString("en-US")} ₼`;

// --- Property Detail enrichment (mock; Supabase joins later) ---

export type Agent = {
  name: string;
  avatar: string;
  verified: boolean;
  phone: string; // digits only, for wa.me / tel:
};

export const defaultAgent: Agent = {
  name: "Rəşad Əliyev",
  avatar: img("1507003211169-0a1dd7228f2d"),
  verified: true,
  phone: "994501234567",
};

// Amenity keys; icon + trilingual label resolved in the screen.
export const defaultAmenities = [
  "parking",
  "elevator",
  "renovation",
  "furniture",
  "internet",
  "security",
];

const interiorB = img("1493809842364-78817add7ffb");
const interiorC = img("1586023492125-27b2c045efd7");

export type ListingDetail = Listing & {
  gallery: string[];
  description: string;
  amenities: string[];
  agent: Agent;
};

export function getListingDetail(id: string): ListingDetail | undefined {
  const l = listings.find((x) => x.id === id);
  if (!l) return undefined;
  return {
    ...l,
    gallery: [l.image, interiorB, interiorC],
    amenities: defaultAmenities,
    agent: defaultAgent,
    description: `${l.district}, ${l.rooms} otaqlı, ${l.areaM2} m² sahəli obyekt. Yüksək keyfiyyətli təmir, rahat yerləşmə və inkişaf etmiş infrastruktur. Binada 24/7 mühafizə, yeraltı qaraj və lift mövcuddur. Əşyalarla birlikdə satıla bilər.`,
  };
}
