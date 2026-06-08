// Diacritic-folding helper for search across az / ru / en place names.
// Folds Azerbaijani special letters to ASCII so a Latin-keyboard query like
// "narimanov" matches "Nərimanov", and lowercases everything. Cyrillic queries
// ("гянджа") already match the ru field after lowercasing; we only fold ё→е.

const FOLD_MAP: Record<string, string> = {
  ə: "e", ı: "i", İ: "i", ş: "s", ç: "c", ğ: "g", ö: "o", ü: "u",
  Ə: "e", I: "i", Ş: "s", Ç: "c", Ğ: "g", Ö: "o", Ü: "u",
  ё: "е", Ё: "е",
};

/** Lowercase + fold az diacritics + strip remaining combining marks. */
export function foldSearch(s: string): string {
  return s
    .replace(/[əıİşçğöüƏIŞÇĞÖÜёЁ]/gu, (ch) => FOLD_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}
