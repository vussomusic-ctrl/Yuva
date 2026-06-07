import { PropertyTypeKey } from "./propertyTypes";
import { BuildKey } from "./buildTypes";
import { placeById, placeName } from "./places";

type Lang = "az" | "ru" | "en";
type T = (key: string, opts?: Record<string, unknown>) => string;

type TitleInput = {
  buildType: BuildKey;
  propertyType: PropertyTypeKey | null;
  rooms: number | string;
  areaM2: number | string;
  regionId?: string | null;
  metroId?: string | null;
};

/**
 * Build a listing title (bina.az style, NO deal verb), e.g.
 * "3-комн. новостройка 55 м², м. Улдуз" / "3 otaqlı yeni tikili 55 m², m. Ulduz".
 *
 * Fully derived from structured fields — no free text — so it is generated ON
 * THE FLY in the VIEWER's current language wherever a title is shown (cards,
 * detail, My listings, preview). Listings store no `title` string.
 * Empty/N-A fields are dropped (land → no rooms/type; no area → no "m²").
 */
export function buildListingTitle(f: TitleInput, t: T, lang: Lang): string {
  const isLand = f.propertyType === "land";

  const parts: string[] = [];
  const rooms = Number(f.rooms);
  if (!isLand && rooms > 0) parts.push(t("listingTitle.rooms", { n: rooms }));
  if (!isLand) parts.push(t(f.buildType === "secondary" ? "listingTitle.secondary" : "listingTitle.newBuild"));
  const area = Number(f.areaM2);
  if (area > 0) parts.push(`${area} ${t("listingTitle.areaUnit")}`);

  // Location: metro (with prefix) wins, else region name.
  let location = "";
  if (f.metroId) {
    const m = placeById(f.metroId);
    if (m) location = `${t("listingTitle.metroPrefix")} ${placeName(m, lang)}`;
  }
  if (!location && f.regionId) {
    const r = placeById(f.regionId);
    if (r) location = placeName(r, lang);
  }

  const head = parts.join(" ");
  if (head && location) return `${head}, ${location}`;
  return head || location;
}
