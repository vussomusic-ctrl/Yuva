// Promotion (monetization) API. Real Supabase writes (read-modify-write; no
// RPC). Errors are returned ({ ok:false }), never thrown — project contract.
// Apple IAP will later wrap these (purchase → on success call the same write).

import { supabase } from "../supabase";

export type PromoChoice =
  | { tier: "boost"; bumps: number }
  | { tier: "vip"; days: number }
  | { tier: "premium"; days: number };

type ActivateResult = { ok: true } | { ok: false; step: "read" | "write" };
type BumpResult = { ok: true; bumpsRemaining: number } | { ok: false; reason: "empty" | "error" };

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

const TIER_ORDER = { none: 0, vip: 1, premium: 2 } as const;

/**
 * Activate a promo (read-modify-write). Boost only adds to the bump balance
 * (orthogonal — tier/expiry untouched). VIP/Premium set the tier + extend
 * promoted_until: if a promo is still active, stack onto its remaining time,
 * and never downgrade an already-higher tier (anti-downgrade guard).
 */
export async function activatePromo(listingId: string, choice: PromoChoice): Promise<ActivateResult> {
  const { data: row, error } = await supabase
    .from("listings")
    .select("promo_tier, promoted_until, bumps_remaining")
    .eq("id", listingId)
    .single();
  if (error || !row) return { ok: false, step: "read" };

  if (choice.tier === "boost") {
    const next = (row.bumps_remaining ?? 0) + choice.bumps;
    const { error: e } = await supabase.from("listings").update({ bumps_remaining: next }).eq("id", listingId);
    return e ? { ok: false, step: "write" } : { ok: true };
  }

  const active = row.promoted_until != null && new Date(row.promoted_until).getTime() > Date.now();
  // Anti-downgrade: an active higher tier is not lowered by buying a lower one.
  let nextTier: "vip" | "premium" = choice.tier;
  if (active && TIER_ORDER[choice.tier] < TIER_ORDER[row.promo_tier as keyof typeof TIER_ORDER]) {
    nextTier = row.promo_tier as "vip" | "premium";
  }
  const base = active ? new Date(row.promoted_until).getTime() : Date.now();
  const nextUntil = new Date(base + choice.days * 86400000).toISOString();
  const { error: e } = await supabase
    .from("listings")
    .update({ promo_tier: nextTier, promoted_until: nextUntil })
    .eq("id", listingId);
  return e ? { ok: false, step: "write" } : { ok: true };
}

/** Spend one bump: decrement balance + stamp last_bumped_at (search freshness). */
export async function bumpListing(listingId: string): Promise<BumpResult> {
  const { data: row, error } = await supabase
    .from("listings")
    .select("bumps_remaining")
    .eq("id", listingId)
    .single();
  if (error || !row) return { ok: false, reason: "error" };
  if ((row.bumps_remaining ?? 0) <= 0) return { ok: false, reason: "empty" };

  const next = row.bumps_remaining - 1;
  const { error: e } = await supabase
    .from("listings")
    .update({ bumps_remaining: next, last_bumped_at: new Date().toISOString() })
    .eq("id", listingId);
  return e ? { ok: false, reason: "error" } : { ok: true, bumpsRemaining: next };
}
