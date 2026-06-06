// Baku administrative districts (rayonlar) for the region filter.
// Geographic proper nouns — NOT translated. Replace with a regions table later.

export const bakuRayons = [
  "Nəsimi",
  "Nizami",
  "Yasamal",
  "Səbail",
  "Xətai",
  "Nərimanov",
  "Binəqədi",
  "Xəzər",
  "Sabunçu",
  "Suraxanı",
  "Qaradağ",
  "Pirallahı",
];

// Baku city centre — map default + fallback for listings without a known rayon.
export const BAKU_CENTER = { lat: 40.4093, lng: 49.8671 };

// Approximate centre of each rayon, for placing user-created listings on the map.
export const rayonCoords: Record<string, { lat: number; lng: number }> = {
  "Nəsimi": { lat: 40.3790, lng: 49.8490 },
  "Nizami": { lat: 40.3790, lng: 49.9490 },
  "Yasamal": { lat: 40.3780, lng: 49.8150 },
  "Səbail": { lat: 40.3640, lng: 49.8370 },
  "Xətai": { lat: 40.3940, lng: 49.9050 },
  "Nərimanov": { lat: 40.4060, lng: 49.8870 },
  "Binəqədi": { lat: 40.4630, lng: 49.8290 },
  "Xəzər": { lat: 40.4220, lng: 50.0480 },
  "Sabunçu": { lat: 40.4430, lng: 49.9480 },
  "Suraxanı": { lat: 40.4140, lng: 50.0080 },
  "Qaradağ": { lat: 40.2300, lng: 49.6320 },
  "Pirallahı": { lat: 40.4730, lng: 50.3170 },
};

// Resolve coordinates from a free-text district string (matches a known rayon by
// substring), falling back to the city centre.
export function coordsForDistrict(district: string): { lat: number; lng: number } {
  const hit = bakuRayons.find((r) => district.includes(r));
  return (hit && rayonCoords[hit]) || BAKU_CENTER;
}
