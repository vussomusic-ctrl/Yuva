// Add Listing form validation — range/sanity rules beyond "not empty".
// validateStep(step, state) → { ok, errors }, where errors maps a field key to
// an i18n key (addListing.err.*). The screen resolves key → message via t() and
// shows it under the offending field (or in a banner for field-less steps).

export type ValidationState = {
  photosCount: number;
  propertyType: string | null;
  isLand: boolean;
  dealType: string; // "sale" | "rent"
  hasPlace: boolean; // placeId != null
  hasPin: boolean; // map pin picked
  phoneLocal: string; // 9-digit local part
  price: string;
  area: string;
  rooms: string;
  baths: string;
  floor: string;
  floorTotal: string;
  builtYear: string;
  telegram: string;
  whatsapp: string;
};

export type StepErrors = Record<string, string>; // fieldKey → i18n error key

const CURRENT_YEAR = new Date().getFullYear();
const n = (s: string) => Number((s ?? "").trim());

/** Validate a single wizard step. Empty + range checks combined. */
export function validateStep(step: number, s: ValidationState): { ok: boolean; errors: StepErrors } {
  const e: StepErrors = {};

  if (step === 1) {
    if (s.photosCount < 1) e.photos = "addListing.err.photos";
  }

  if (step === 2) {
    if (!s.propertyType) e.propertyType = "addListing.err.propertyType";
  }

  if (step === 3) {
    // Price by deal type
    const price = n(s.price);
    const minPrice = s.dealType === "rent" ? 50 : 5000;
    if (!(price >= minPrice)) e.price = s.dealType === "rent" ? "addListing.err.priceLowRent" : "addListing.err.priceLowSale";

    // Area by property kind
    const area = n(s.area);
    if (s.isLand) {
      if (!(area >= 0.5 && area <= 10000)) e.area = "addListing.err.areaLand";
    } else {
      if (!(area >= 10 && area <= 5000)) e.area = "addListing.err.area";
    }

    if (!s.isLand) {
      const rooms = n(s.rooms);
      if (!(rooms >= 1 && rooms <= 30)) e.rooms = "addListing.err.rooms";

      if (s.baths.trim() !== "") {
        const baths = n(s.baths);
        if (!(baths >= 0 && baths <= 15)) e.baths = "addListing.err.baths";
      }

      if (s.floor.trim() !== "" && s.floorTotal.trim() !== "") {
        const f = n(s.floor);
        const ft = n(s.floorTotal);
        if (Number.isFinite(f) && Number.isFinite(ft) && f > ft) e.floor = "addListing.err.floorGtTotal";
      }
    }
  }

  if (step === 4) {
    if (!s.hasPlace && !s.hasPin) e.location = "addListing.err.location";
  }

  if (step === 5) {
    if (s.builtYear.trim() !== "") {
      const y = n(s.builtYear);
      if (!(y >= 1900 && y <= CURRENT_YEAR + 2)) e.builtYear = "addListing.err.builtYear";
    }
  }

  if (step === 7) {
    if (s.phoneLocal.length !== 9) e.phone = "addListing.err.phone";

    const tg = s.telegram.trim().replace(/^@/, "");
    if (s.telegram.trim() !== "" && (tg.length < 5 || !/[a-zA-Z]/.test(tg))) {
      e.telegram = "addListing.err.telegram";
    }

    const waDigits = s.whatsapp.replace(/\D/g, "");
    if (s.whatsapp.trim() !== "" && waDigits.length < 9) {
      e.whatsapp = "addListing.err.whatsapp";
    }
  }

  return { ok: Object.keys(e).length === 0, errors: e };
}

/** Final guard before publish — first step that fails, or null when all pass. */
export function validateAll(s: ValidationState): { ok: boolean; firstBadStep: number | null } {
  for (const step of [1, 2, 3, 4, 5, 7]) {
    if (!validateStep(step, s).ok) return { ok: false, firstBadStep: step };
  }
  return { ok: true, firstBadStep: null };
}
