// Single source of truth for the deal-type FILTER value.
// Only sale/rent are filter values. "Sell" is an ACTION (create a listing) and
// lives on the center Add tab — it is intentionally NOT a deal type here.
// Shared by Home, Search (chips) and Filters (segment).

export type DealKey = "sale" | "rent";

export const DEALS: { key: DealKey; labelKey: string }[] = [
  { key: "sale", labelKey: "home.dealSale" },
  { key: "rent", labelKey: "home.dealRent" },
];
