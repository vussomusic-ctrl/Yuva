// Single source of truth for property types. Shared by Filters (multi-select
// chips) and Add Listing (single-select). Same keys + i18n labels everywhere.

export type PropertyTypeKey = "apartment" | "house" | "land" | "object";

// Shared land predicate — used on BOTH sides of the adapter (formToRow /
// rowToForm) so the land area branch (land_area_sot ↔ area_m2) never drifts.
export const isLandType = (t: PropertyTypeKey | null) => t === "land";

export const PROPERTY_TYPES: { key: PropertyTypeKey; labelKey: string }[] = [
  { key: "apartment", labelKey: "filters.typeApartment" },
  { key: "house", labelKey: "filters.typeHouse" },
  { key: "land", labelKey: "filters.typeLand" },
  { key: "object", labelKey: "filters.typeObject" },
];
