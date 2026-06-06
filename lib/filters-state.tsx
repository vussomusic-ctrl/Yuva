import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import { DealKey } from "./dealTypes";
import { PropertyTypeKey } from "./propertyTypes";
import { BuildKey } from "./buildTypes";
import { Listing } from "./mock/listings";

/**
 * App-wide active Search filters. ONE source of truth (like `useFavorites`) so
 * the Filters modal, the Search deal chips and the Search results list all read
 * and write the same set — the deal type can never drift between them.
 * Numeric ranges are kept as strings to match the text inputs. In-memory only.
 */
export type Filters = {
  dealType: DealKey;
  propertyTypes: PropertyTypeKey[];
  buildType: BuildKey | null; // null = any
  priceMin: string;
  priceMax: string;
  rooms: string[];
  baths: string[];
  areaMin: string;
  areaMax: string;
  regions: string[];
  floorMin: string;
  floorMax: string;
  furnished: boolean;
  mortgage: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  dealType: "sale",
  propertyTypes: [],
  buildType: null,
  priceMin: "",
  priceMax: "",
  rooms: [],
  baths: [],
  areaMin: "",
  areaMax: "",
  regions: [],
  floorMin: "",
  floorMax: "",
  furnished: false,
  mortgage: false,
};

/**
 * Count of applied narrowing filters. Excludes `dealType` — it always has a
 * value and is surfaced separately as the deal chips, so it isn't "active
 * filtering" from the user's point of view. Drives the Search filter badge.
 */
export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.propertyTypes.length) n++;
  if (f.buildType) n++;
  if (f.priceMin || f.priceMax) n++;
  if (f.rooms.length) n++;
  if (f.baths.length) n++;
  if (f.areaMin || f.areaMax) n++;
  if (f.regions.length) n++;
  if (f.floorMin || f.floorMax) n++;
  if (f.furnished) n++;
  if (f.mortgage) n++;
  return n;
}

/** Pure predicate: apply the active filters to a list of mock listings. */
export function filterListings(items: Listing[], f: Filters): Listing[] {
  return items.filter((l) => {
    if (l.dealType !== f.dealType) return false;
    if (f.propertyTypes.length && !f.propertyTypes.includes(l.propertyType)) return false;
    if (f.buildType && l.buildType !== f.buildType) return false;
    if (f.priceMin && l.priceAzn < Number(f.priceMin)) return false;
    if (f.priceMax && l.priceAzn > Number(f.priceMax)) return false;
    if (f.rooms.length) {
      const ok = f.rooms.some((r) => (r === "5+" ? l.rooms >= 5 : Number(r) === l.rooms));
      if (!ok) return false;
    }
    if (f.baths.length) {
      const ok = f.baths.some((b) => (b === "4+" ? l.baths >= 4 : Number(b) === l.baths));
      if (!ok) return false;
    }
    if (f.areaMin && l.areaM2 < Number(f.areaMin)) return false;
    if (f.areaMax && l.areaM2 > Number(f.areaMax)) return false;
    if (f.regions.length && !f.regions.some((r) => l.district.includes(r))) return false;
    if (f.floorMin && (l.floor == null || l.floor < Number(f.floorMin))) return false;
    if (f.floorMax && (l.floor == null || l.floor > Number(f.floorMax))) return false;
    if (f.furnished && !l.furnished) return false;
    if (f.mortgage && !l.mortgage) return false;
    return true;
  });
}

type FiltersContextValue = {
  filters: Filters;
  apply: (f: Filters) => void; // replace the whole set (from the Filters modal)
  setDealType: (d: DealKey) => void; // quick toggle from the Search deal chips
  clear: () => void; // reset narrowing filters, keep the current deal type
  activeCount: number;
};

const FiltersContext = createContext<FiltersContextValue>({
  filters: DEFAULT_FILTERS,
  apply: () => {},
  setDealType: () => {},
  clear: () => {},
  activeCount: 0,
});

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const apply = useCallback((f: Filters) => setFilters(f), []);
  const setDealType = useCallback(
    (d: DealKey) => setFilters((cur) => ({ ...cur, dealType: d })),
    [],
  );
  const clear = useCallback(
    () => setFilters((cur) => ({ ...DEFAULT_FILTERS, dealType: cur.dealType })),
    [],
  );

  const value = useMemo<FiltersContextValue>(
    () => ({ filters, apply, setDealType, clear, activeCount: activeFilterCount(filters) }),
    [filters, apply, setDealType, clear],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  return useContext(FiltersContext);
}
