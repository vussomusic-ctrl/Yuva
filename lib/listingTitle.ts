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
  landAreaSot?: number | string | null;
  placeId?: string | null;
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
// Property-type i18n labels (same as the filter chips), used in the title head.
const TYPE_LABEL: Record<PropertyTypeKey, string> = {
  apartment: "filters.typeApartment",
  house: "filters.typeHouse",
  land: "filters.typeLand",
  object: "filters.typeObject",
};

export function buildListingTitle(f: TitleInput, t: T, lang: Lang, opts?: { withMetro?: boolean; withRegion?: boolean }): string {
  const isLand = f.propertyType === "land";
  const isResidential = f.propertyType === "apartment" || f.propertyType === "house";
  const rooms = Number(f.rooms);

  // Head: rooms (residential only) + property-type label (lowercased), e.g.
  // "3-комн. квартира" / "земля" / "объект". buildType is NOT shown in the title.
  const typeLabel = f.propertyType ? t(TYPE_LABEL[f.propertyType]).toLocaleLowerCase(lang) : "";
  const headBits: string[] = [];
  if (isResidential && rooms > 0) headBits.push(t("listingTitle.rooms", { n: rooms }));
  if (typeLabel) headBits.push(typeLabel);
  const head = headBits.join(" ");

  // Area: land → "sot", everything else → m². Never show "0 m²" for land.
  let areaStr = "";
  if (isLand) {
    const sot = Number(f.landAreaSot);
    if (sot > 0) areaStr = `${sot} ${t("listingTitle.sotUnit")}`;
  } else {
    const area = Number(f.areaM2);
    if (area > 0) areaStr = `${area} ${t("listingTitle.areaUnit")}`;
  }

  // Location: metro (with prefix) wins, else region name. Metro can be suppressed
  // (withMetro:false) where it's shown separately (e.g. PropertyCard's MetroBadge).
  let location = "";
  if (f.metroId && opts?.withMetro !== false) {
    const m = placeById(f.metroId);
    if (m) location = `${t("listingTitle.metroPrefix")} ${placeName(m, lang)}`;
  }
  if (!location && f.placeId && opts?.withRegion !== false) {
    const r = placeById(f.placeId);
    if (r) location = placeName(r, lang);
  }

  // "3-комн. квартира, 85.3 м², Баку" — segments comma-joined; empties dropped.
  const title = [head, areaStr, location].filter(Boolean).join(", ");
  // Capitalize only the first character (land/commercial lead with a lowercased
  // type label, e.g. "земля" → "Земля"); rest is left intact (m², names…).
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : title;
}
