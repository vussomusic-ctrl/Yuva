// Coordinate validator for the places directory.
//
// Why this exists: region coords were once shipped with `lng: NaN` (TypeScript
// can't catch that — NaN is a valid `number`), so every region pin was unplottable
// and coastal centroids would have landed in the Caspian. This guard runs in CI
// (`npm run validate:places`) and FAILS with the offending ids if any place has a
// non-finite coord, sits outside the Azerbaijan bbox, or falls in the sea.
//
// Checks per place:
//   1. Number.isFinite(lat) && Number.isFinite(lng)   — no NaN/undefined
//   2. inside AZ bounding box                          — sane range
//   3. on land                                         — inside a simplified
//      mainland-AZ or Naxçıvan land outline (rejects Caspian points)
//
// The land outline is intentionally GENEROUS on the inland borders (nowhere near
// water) and TIGHT only along the Caspian coast — the one edge that matters.

import { PLACES } from "./places";

export const AZ_BBOX = { minLat: 38.39, maxLat: 41.91, minLng: 44.76, maxLng: 50.37 };

// Polygons as [lng, lat] vertices. A point is "on land" if inside EITHER
// (mainland is one body; Naxçıvan is a separate exclave).
const MAINLAND: [number, number][] = [
  [44.6, 42.0], [48.6, 42.0], [49.05, 41.3], [49.25, 41.05], [49.78, 40.62],
  [50.45, 40.55], [50.45, 40.3], [49.7, 40.05], [49.55, 39.4], [49.45, 39.1],
  [49.2, 38.7], [48.98, 38.35], [48.0, 38.2], [46.3, 38.9], [45.8, 39.7],
  [45.5, 40.3], [44.8, 40.8], [44.6, 41.2],
];
const NAXCIVAN: [number, number][] = [
  [44.7, 39.85], [46.2, 39.85], [46.2, 38.8], [44.7, 38.8],
];

// Ray-casting point-in-polygon. poly = [[lng,lat], ...].
function pointInPolygon(lng: number, lat: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const onLand = (lng: number, lat: number): boolean =>
  pointInPolygon(lng, lat, MAINLAND) || pointInPolygon(lng, lat, NAXCIVAN);

export type PlaceCoordError = { id: string; reason: string };

export function validatePlaces(): { ok: boolean; errors: PlaceCoordError[] } {
  const errors: PlaceCoordError[] = [];
  for (const p of PLACES) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) {
      errors.push({ id: p.id, reason: `non-finite coord (lat=${p.lat}, lng=${p.lng})` });
      continue; // bbox/land checks are meaningless on NaN
    }
    if (
      p.lat < AZ_BBOX.minLat || p.lat > AZ_BBOX.maxLat ||
      p.lng < AZ_BBOX.minLng || p.lng > AZ_BBOX.maxLng
    ) {
      errors.push({ id: p.id, reason: `outside AZ bbox (lat=${p.lat}, lng=${p.lng})` });
      continue;
    }
    if (!onLand(p.lng, p.lat)) {
      errors.push({ id: p.id, reason: `in water / off-land (lat=${p.lat}, lng=${p.lng})` });
    }
  }
  return { ok: errors.length === 0, errors };
}

// CI entry point: `npm run validate:places`. Prints failures and exits non-zero.
if (import.meta.url.includes("places.validate")) {
  const { ok, errors } = validatePlaces();
  if (ok) {
    console.log(`✓ places: all ${PLACES.length} coordinates valid (finite, in bbox, on land)`);
  } else {
    console.error(`✗ places: ${errors.length} invalid coordinate(s):`);
    for (const e of errors) console.error(`  - ${e.id}: ${e.reason}`);
    process.exit(1);
  }
}
