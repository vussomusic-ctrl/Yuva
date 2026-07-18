// Single source of truth for land purpose (назначение земли). Shared by Filters
// (chips) and the add-listing form. Mirrors buildTypes.ts / renovationTypes.ts so
// labels + keys never drift. Keys match the DB check constraint
// (listings.land_purpose). Labels reuse the existing i18n namespace
// addListing.landPurposeOpts.*

export type LandPurposeKey = "residential" | "commercial" | "agricultural";

export const LAND_PURPOSE_TYPES: { key: LandPurposeKey; labelKey: string }[] = [
  { key: "residential", labelKey: "addListing.landPurposeOpts.residential" },
  { key: "commercial", labelKey: "addListing.landPurposeOpts.commercial" },
  { key: "agricultural", labelKey: "addListing.landPurposeOpts.agricultural" },
];

export const LAND_PURPOSE_KEYS: LandPurposeKey[] = LAND_PURPOSE_TYPES.map((p) => p.key);
