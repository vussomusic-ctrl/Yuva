// Shared search/selection helpers for the location pickers (filter sheet +
// add-listing sheet), so the two never drift.

import { Place, placeById } from "./places";
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
