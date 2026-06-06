// Single source of truth for the building type (new build vs secondary market).
// Shared by Filters (chips) and the listing model. Mirrors dealTypes.ts /
// propertyTypes.ts so labels + keys never drift.

export type BuildKey = "new" | "secondary";

export const BUILD_TYPES: { key: BuildKey; labelKey: string }[] = [
  { key: "new", labelKey: "filters.buildNew" },
  { key: "secondary", labelKey: "filters.buildSecondary" },
];
