// Single source of truth for property types. Shared by Filters (multi-select
// chips) and Add Listing (single-select). Same keys + i18n labels everywhere.

export type PropertyTypeKey = "apartment" | "house" | "land" | "object";

export const PROPERTY_TYPES: { key: PropertyTypeKey; labelKey: string }[] = [
  { key: "apartment", labelKey: "filters.typeApartment" },
  { key: "house", labelKey: "filters.typeHouse" },
  { key: "land", labelKey: "filters.typeLand" },
  { key: "object", labelKey: "filters.typeObject" },
];
