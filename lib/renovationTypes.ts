// Single source of truth for renovation type. Shared by Filters (chips) and the
// add-listing form. Mirrors buildTypes.ts / dealTypes.ts so labels + keys never
// drift. Keys match the DB check constraint (listings.renovation).
// Labels reuse the existing i18n namespace addListing.renovationOpts.*

export type RenovationKey = "euro" | "designer" | "cosmetic" | "rough" | "none";

export const RENOVATION_TYPES: { key: RenovationKey; labelKey: string }[] = [
  { key: "euro", labelKey: "addListing.renovationOpts.euro" },
  { key: "designer", labelKey: "addListing.renovationOpts.designer" },
  { key: "cosmetic", labelKey: "addListing.renovationOpts.cosmetic" },
  { key: "rough", labelKey: "addListing.renovationOpts.rough" },
  { key: "none", labelKey: "addListing.renovationOpts.none" },
];

export const RENOVATION_KEYS: RenovationKey[] = RENOVATION_TYPES.map((r) => r.key);
