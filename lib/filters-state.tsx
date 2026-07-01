import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

import { DealKey } from "./dealTypes";
import { PropertyTypeKey, isLandType } from "./propertyTypes";
import { BuildKey } from "./buildTypes";
import { Listing } from "./mock/listings";
import { AREAS, areasOfRayon, placeById } from "./places";

/**
 * Expand selected region ids into the full set of place ids a listing may carry.
 * Listings store a single leaf placeId, so a "whole area" selection must roll
 * down to its descendants:
 *   - "baku"        -> Baku + all its areas (rayons / qəsəbə / microrayon)
 *   - a Baku rayon  -> the rayon + its child zones (areasOfRayon)
 *   - anything else -> itself (country region, or a specific Baku zone)
 */
function expandRegions(ids: string[]): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    out.add(id);
    if (id === "baku") {
      for (const a of AREAS) out.add(a.id);
    } else {
      const p = placeById(id);
      if (p?.kind === "area" && p.type === "rayon") {
        for (const a of areasOfRayon(id)) out.add(a.id);
      }
    }
  }
  return out;
}

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
  regions: string[]; // Place ids (rayon/qəsəbə/microrayon)
  metro: string[]; // metro Place ids
  floorMin: string;
  floorMax: string;
  furnished: boolean;
  mortgage: boolean;
  amenities: string[]; // amenity keys (lib/amenities) — AND-match: listing must have ALL
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
  metro: [],
  floorMin: "",
  floorMax: "",
  furnished: false,
  mortgage: false,
  amenities: [],
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
  if (f.metro.length) n++;
  if (f.floorMin || f.floorMax) n++;
  if (f.furnished) n++;
  if (f.mortgage) n++;
  if (f.amenities.length) n++;
  return n;
}

/** Pure predicate: apply the active filters to a list of mock listings. */
export function filterListings(items: Listing[], f: Filters): Listing[] {
  // Build the region membership set once (parents rolled down to descendants).
  const regionSet = f.regions.length ? expandRegions(f.regions) : null;
  return items.filter((l) => {
    if (l.dealType !== f.dealType) return false;
    if (f.propertyTypes.length && !f.propertyTypes.includes(l.propertyType)) return false;
    if (f.amenities.length && !f.amenities.every((k) => (l.amenities ?? []).includes(k))) return false;
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
    // Площадь: если выбрана ТОЛЬКО земля — фильтруем по сотках; иначе по м², но землю (areaM2==0) не отсекаем
    {
      const landOnly = f.propertyTypes.length === 1 && isLandType(f.propertyTypes[0]);
      if (landOnly) {
        const sot = l.landAreaSot ?? 0;
        if (f.areaMin && sot < Number(f.areaMin)) return false;
        if (f.areaMax && sot > Number(f.areaMax)) return false;
      } else if (l.areaM2 > 0) {
        if (f.areaMin && l.areaM2 < Number(f.areaMin)) return false;
        if (f.areaMax && l.areaM2 > Number(f.areaMax)) return false;
      }
      // если не landOnly и areaM2==0 (земля в смешанном/пустом наборе) — фильтр площади пропускаем, участок не выпадает
    }
    if (regionSet && !(l.placeId && regionSet.has(l.placeId))) return false;
    if (f.metro.length && !(l.metroId && f.metro.includes(l.metroId))) return false;
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
  // Granular setters for the Search quick-filter chips (same source of truth).
  setPropertyTypes: (types: PropertyTypeKey[]) => void;
  setRooms: (rooms: string[]) => void;
  toggleRoom: (room: string) => void;
  setBuildType: (b: BuildKey | null) => void;
  setPriceRange: (min: string, max: string) => void;
  setAreaRange: (min: string, max: string) => void;
  toggleAmenity: (key: string) => void;
  clear: () => void; // reset narrowing filters, keep the current deal type
  activeCount: number;
};

const FiltersContext = createContext<FiltersContextValue>({
  filters: DEFAULT_FILTERS,
  apply: () => {},
  setDealType: () => {},
  setPropertyTypes: () => {},
  setRooms: () => {},
  toggleRoom: () => {},
  setBuildType: () => {},
  setPriceRange: () => {},
  setAreaRange: () => {},
  toggleAmenity: () => {},
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
  const setPropertyTypes = useCallback(
    (types: PropertyTypeKey[]) => setFilters((cur) => ({ ...cur, propertyTypes: types })),
    [],
  );
  const setRooms = useCallback((rooms: string[]) => setFilters((cur) => ({ ...cur, rooms })), []);
  const toggleRoom = useCallback(
    (room: string) =>
      setFilters((cur) => ({
        ...cur,
        rooms: cur.rooms.includes(room) ? cur.rooms.filter((r) => r !== room) : [...cur.rooms, room],
      })),
    [],
  );
  const setBuildType = useCallback((b: BuildKey | null) => setFilters((cur) => ({ ...cur, buildType: b })), []);
  const setPriceRange = useCallback((min: string, max: string) => setFilters((cur) => ({ ...cur, priceMin: min, priceMax: max })), []);
  const setAreaRange = useCallback((min: string, max: string) => setFilters((cur) => ({ ...cur, areaMin: min, areaMax: max })), []);
  const toggleAmenity = useCallback(
    (key: string) =>
      setFilters((cur) => ({
        ...cur,
        amenities: cur.amenities.includes(key) ? cur.amenities.filter((k) => k !== key) : [...cur.amenities, key],
      })),
    [],
  );
  const clear = useCallback(
    () => setFilters((cur) => ({ ...DEFAULT_FILTERS, dealType: cur.dealType })),
    [],
  );

  const value = useMemo<FiltersContextValue>(
    () => ({
      filters,
      apply,
      setDealType,
      setPropertyTypes,
      setRooms,
      toggleRoom,
      setBuildType,
      setPriceRange,
      setAreaRange,
      toggleAmenity,
      clear,
      activeCount: activeFilterCount(filters),
    }),
    [filters, apply, setDealType, setPropertyTypes, setRooms, toggleRoom, setBuildType, setPriceRange, setAreaRange, toggleAmenity, clear],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  return useContext(FiltersContext);
}
