// Shared search/selection helpers for the location pickers (filter sheet +
// add-listing sheet), so the two never drift.

import { Place, placeById, placeName, REGIONS, AREAS, METRO } from "./places";
import { foldSearch } from "./normalize";

// "Популярные" — hand-picked top regions (ids that actually exist in places.ts).
export const POPULAR = ["baku", "sumqayit_city", "gence_city", "abseron_rayon", "naxcivan_city", "lenkeran_city"];

// Name match across az/ru/en with a folded (diacritic-insensitive) query.
export const matchPlace = (p: Place, folded: string): boolean =>
  !folded || foldSearch(`${p.az} ${p.ru} ${p.en}`).includes(folded);

// Is this id a "Baku context" (Baku itself / its rayons / areas / metro)?
export const isBakuId = (id: string): boolean => {
  const p = placeById(id);
  return id === "baku" || p?.parentId === "baku";
};

// One-line label for the currently-picked location filter (metro wins over region;
// extra picks collapse to "Name +N"). null when nothing is selected.
export function locationLabel(filters: { regions: string[]; metro: string[] }, lang: "az" | "ru" | "en"): string | null {
  const total = filters.regions.length + filters.metro.length;
  if (total === 0) return null;
  const p = placeById(filters.metro[0] ?? filters.regions[0]);
  if (!p) return null;
  const name = placeName(p, lang);
  return total > 1 ? `${name} +${total - 1}` : name;
}

// Live suggestions for the search takeover: republic cities/rayons, Baku zones,
// and metro — each matched by the folded query and capped per group. Empty query
// → empty groups (the UI shows recent/popular instead).
export function searchPlaces(q: string, maxPerGroup = 5): { regions: Place[]; zones: Place[]; metro: Place[] } {
  const folded = foldSearch(q.trim());
  if (!folded) return { regions: [], zones: [], metro: [] };
  return {
    regions: REGIONS.filter((p) => matchPlace(p, folded)).slice(0, maxPerGroup),
    zones: AREAS.filter((p) => matchPlace(p, folded)).slice(0, maxPerGroup),
    metro: METRO.filter((p) => matchPlace(p, folded)).slice(0, maxPerGroup),
  };
}
