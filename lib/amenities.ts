// Single source of truth for amenities. Shared by Add Listing (grouped PNG
// chips), Property Detail (flat Ionicons list) and — going forward — the
// Filters amenity picker. `key` is what's stored in listings.amenities[].
// Each item carries BOTH icon systems so neither screen's visuals change:
//   - `icon`        → PNG require, used by the Add Listing chips
//   - `iconIonicon` → Ionicons glyph name, used by the Detail reference list
import { Ionicons } from "@expo/vector-icons";

export type AmenityKey =
  | "concierge" | "security" | "fence" | "parking" | "elevator" | "playground" | "pool" | "gym"
  | "ac" | "warm_floor" | "balcony" | "sea_view" | "panoramic" | "appliances"
  | "metro" | "school" | "sea" | "park";

export const AMENITY_GROUPS: {
  titleKey: string;
  items: { key: AmenityKey; labelKey: string; icon: number; iconIonicon: keyof typeof Ionicons.glyphMap }[];
}[] = [
  {
    titleKey: "addListing.amenInHouse",
    items: [
      { key: "concierge", labelKey: "addListing.amenity.concierge", icon: require("../assets/icons/amenities/concierge.png"), iconIonicon: "notifications-outline" },
      { key: "security", labelKey: "addListing.amenity.security", icon: require("../assets/icons/amenities/shield.png"), iconIonicon: "shield-checkmark-outline" },
      { key: "fence", labelKey: "addListing.amenity.fence", icon: require("../assets/icons/amenities/fence.png"), iconIonicon: "lock-closed-outline" },
      { key: "parking", labelKey: "addListing.amenity.parking", icon: require("../assets/icons/amenities/parking.png"), iconIonicon: "car-outline" },
      { key: "elevator", labelKey: "addListing.amenity.elevator", icon: require("../assets/icons/amenities/elevator.png"), iconIonicon: "swap-vertical-outline" },
      { key: "playground", labelKey: "addListing.amenity.playground", icon: require("../assets/icons/amenities/playground.png"), iconIonicon: "happy-outline" },
      { key: "pool", labelKey: "addListing.amenity.pool", icon: require("../assets/icons/amenities/pool.png"), iconIonicon: "water-outline" },
      { key: "gym", labelKey: "addListing.amenity.gym", icon: require("../assets/icons/amenities/gym.png"), iconIonicon: "barbell-outline" },
    ],
  },
  {
    titleKey: "addListing.amenInApartment",
    items: [
      { key: "ac", labelKey: "addListing.amenity.ac", icon: require("../assets/icons/amenities/ac.png"), iconIonicon: "snow-outline" },
      { key: "warm_floor", labelKey: "addListing.amenity.warmFloor", icon: require("../assets/icons/amenities/warm_floor.png"), iconIonicon: "flame-outline" },
      { key: "balcony", labelKey: "addListing.amenity.balcony", icon: require("../assets/icons/amenities/balcony.png"), iconIonicon: "browsers-outline" },
      { key: "sea_view", labelKey: "addListing.amenity.seaView", icon: require("../assets/icons/amenities/wave.png"), iconIonicon: "eye-outline" },
      { key: "panoramic", labelKey: "addListing.amenity.panoramic", icon: require("../assets/icons/amenities/window.png"), iconIonicon: "tablet-landscape-outline" },
      { key: "appliances", labelKey: "addListing.amenity.appliances", icon: require("../assets/icons/amenities/appliances.png"), iconIonicon: "hardware-chip-outline" },
    ],
  },
  {
    titleKey: "addListing.amenNearby",
    items: [
      { key: "metro", labelKey: "addListing.amenity.metro", icon: require("../assets/icons/amenities/metro.png"), iconIonicon: "train-outline" },
      { key: "school", labelKey: "addListing.amenity.school", icon: require("../assets/icons/amenities/school.png"), iconIonicon: "school-outline" },
      { key: "sea", labelKey: "addListing.amenity.sea", icon: require("../assets/icons/amenities/boat.png"), iconIonicon: "boat-outline" },
      { key: "park", labelKey: "addListing.amenity.park", icon: require("../assets/icons/amenities/park.png"), iconIonicon: "leaf-outline" },
    ],
  },
];

// Flat list of all keys (order = groups top-to-bottom). Handy for the filter.
export const AMENITY_KEYS: AmenityKey[] = AMENITY_GROUPS.flatMap((g) => g.items.map((it) => it.key));

// Flat key → { iconIonicon, labelKey } lookup for the Detail reference list.
// Keyed by plain string: listing.amenities is string[] and may carry an unknown
// code, so lookups return undefined (Detail guards with `if (!meta) return null`).
export const AMENITY_META: Record<string, { iconIonicon: keyof typeof Ionicons.glyphMap; labelKey: string }> =
  Object.fromEntries(
    AMENITY_GROUPS.flatMap((g) => g.items.map((it) => [it.key, { iconIonicon: it.iconIonicon, labelKey: it.labelKey }])),
  );
