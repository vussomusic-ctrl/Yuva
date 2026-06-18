// Recently-viewed listing history, persisted on-device via lib/storage.
// Most-recent first, deduped, capped at N. Best-effort — any storage/parse
// error degrades to an empty list (never blocks the UI).

import * as storage from "./storage";

const KEY = "recently_viewed";
const N = 12;

/** Read the viewed-id list (most-recent first), or [] on absence/parse error. */
export async function getViewedIds(): Promise<string[]> {
  const raw = await storage.get(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Record a listing view: move id to the front (dedup), cap at N. */
export async function addViewed(id: string): Promise<void> {
  const ids = await getViewedIds();
  const next = [id, ...ids.filter((x) => x !== id)].slice(0, N);
  await storage.set(KEY, JSON.stringify(next));
}
