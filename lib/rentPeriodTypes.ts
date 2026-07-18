// Single source of truth for rent period (период аренды). Shared by Filters
// (chips) and the add-listing form. Mirrors buildTypes.ts / landPurposeTypes.ts so
// labels + keys never drift. Keys match the DB check constraint
// (listings.rent_period). Labels reuse the existing i18n namespace
// addListing.rentPeriodOpts.*

export type RentPeriodKey = "monthly" | "daily";

export const RENT_PERIOD_TYPES: { key: RentPeriodKey; labelKey: string }[] = [
  { key: "monthly", labelKey: "addListing.rentPeriodOpts.monthly" },
  { key: "daily", labelKey: "addListing.rentPeriodOpts.daily" },
];

export const RENT_PERIOD_KEYS: RentPeriodKey[] = RENT_PERIOD_TYPES.map((p) => p.key);
