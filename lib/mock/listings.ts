// Mock listings for the Home Feed. Replace with Supabase `listings` query later.
// Titles/districts are user-generated content (Azerbaijani) — not translated.

export type Listing = {
  id: string;
  image: string;
  priceAzn: number;
  areaM2: number;
  rooms: number;
  floor?: number;
  floorTotal?: number;
  district: string;
  title: string;
  premium: boolean;
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
    title: "Nizami rayonu, 3 otaqlı mənzil",
    premium: true,
  },
  {
    id: "2",
    image: img("1512917774080-9991f1c4c750"),
    priceAzn: 420000,
    areaM2: 210,
    rooms: 5,
    district: "Xəzər rayonu",
    title: "Xəzər rayonu, Villa",
    premium: true,
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
    title: "Yasamal rayonu, 2 otaqlı mənzil",
    premium: true,
  },
  {
    id: "4",
    image: img("1560448204-e02f11c3d0e2"),
    priceAzn: 185000,
    areaM2: 65,
    rooms: 2,
    floor: 4,
    floorTotal: 12,
    district: "28 May metrosu yaxınlığında",
    title: "Nəsimi r-nu, 2 otaqlı təmirli mənzil",
    premium: false,
  },
  {
    id: "5",
    image: img("1568605114967-8130f3a36994"),
    priceAzn: 320000,
    areaM2: 140,
    rooms: 4,
    district: "Abşeron, Mərdəkan",
    title: "Mərdəkanda həyət evi, 4 otaq",
    premium: false,
  },
  {
    id: "6",
    image: img("1586023492125-27b2c045efd7"),
    priceAzn: 132000,
    areaM2: 54,
    rooms: 1,
    floor: 9,
    floorTotal: 14,
    district: "Xətai rayonu",
    title: "Xətai rayonu, 1 otaqlı yeni tikili",
    premium: false,
  },
];

export const recommendedListings = listings.filter((l) => l.premium);
export const newListings = listings;

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
