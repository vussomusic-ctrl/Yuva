// Recent location-search history, persisted on-device via lib/storage. Stores
// place ids (metro ids too — resolved via placeById). Most-recent first, deduped,
// capped at N. Best-effort — any storage/parse error degrades to an empty list.

import * as storage from "./storage";

const KEY = "recent_searches_places";
const N = 8;

/** Read the recent place-id list (most-recent first), or [] on absence/error. */
export async function getRecentSearchIds(): Promise<string[]> {
  const raw = await storage.get(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Record a search pick: move id to the front (dedup), cap at N. */
export async function addRecentSearch(id: string): Promise<void> {
  const ids = await getRecentSearchIds();
  const next = [id, ...ids.filter((x) => x !== id)].slice(0, N);
  await storage.set(KEY, JSON.stringify(next));
}
