// Plural-form selector that does NOT rely on Intl.PluralRules (Hermes ships
// without full ICU data, so i18next's CLDR plural detection is unreliable on
// device). Returns the key suffix; callers request `key_<suffix>` directly so
// i18next just interpolates {{count}} (no re-pluralization).

export type PluralSuffix = "one" | "few" | "many" | "other";

export function pluralSuffix(lang: string, n: number): PluralSuffix {
  if (lang === "ru") {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "one"; // 1, 21, 31 → подъём
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "few"; // 2-4, 22-24 → подъёма
    return "many"; // 0, 5-20, 25-30 → подъёмов
  }
  if (lang === "en") return n === 1 ? "one" : "other";
  return "other"; // az — single form (no number agreement)
}
