// Amenity code → localized label, with a humanized fallback so a future code
// without a translation never leaks the raw i18n key (e.g. "warm_floor" →
// "Warm floor" instead of "addListing.amenity.warm_floor").

type Tfn = (key: string, opts?: Record<string, unknown>) => string;

export function amenityLabel(code: string, t: Tfn): string {
  const key = `addListing.amenity.${code}`;
  const label = t(key);
  if (label && label !== key) return label;
  // Fallback: "warm_floor" → "Warm floor"
  const spaced = code.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
