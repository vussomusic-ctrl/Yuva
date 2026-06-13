// Promotion (monetization) API. STUBS for now — no DB writes yet; the real
// Supabase mutations land in Шаг Д (and later Apple IAP behind activatePromo).

export type PromoChoice =
  | { tier: "boost"; bumps: number }
  | { tier: "vip"; days: number }
  | { tier: "premium"; days: number };

// Pricing in AZN. `oldPrice` is the struck-through "before" price (bina.az style).
// Single source of truth — tweak here when prices change.
export const PROMO_PRICING = {
  boost: [
    { n: 1, price: 2, oldPrice: 3 },
    { n: 3, price: 5, oldPrice: 7 },
    { n: 5, price: 8, oldPrice: 11 },
    { n: 10, price: 14, oldPrice: 18 },
  ],
  vip: [
    { days: 1, price: 5, oldPrice: 7 },
    { days: 7, price: 18, oldPrice: 25 },
    { days: 30, price: 35, oldPrice: 45 },
  ],
  premium: [
    { days: 7, price: 25, oldPrice: 35 },
    { days: 30, price: 60, oldPrice: 80 },
  ],
} as const;

/** Buy/activate a promo. STUB — replace with real Supabase write in Шаг Д. */
export async function activatePromo(listingId: string, choice: PromoChoice): Promise<void> {
  await new Promise((r) => setTimeout(r, 600));
  console.log("[promo stub]", listingId, choice); // TODO Шаг Д: реальная запись в Supabase
}

/** Spend one bump (boost). STUB — replace with real Supabase write in Шаг Д. */
export async function bumpListing(listingId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 600));
  console.log("[bump stub]", listingId); // TODO Шаг Д: реальная запись в Supabase
}
