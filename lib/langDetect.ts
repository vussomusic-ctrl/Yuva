// Cheap heuristic to guess the language of a user-written listing description,
// so the "Translate" button only shows when it differs from the UI language.
// Cyrillic → Russian (reliable). Azerbaijani-specific letters → Azerbaijani.
// Otherwise Latin → English (fallback). Not perfect (an az text without special
// letters reads as en), but good enough for the translate affordance.
export function detectLang(text: string): "az" | "ru" | "en" {
  if (/[а-яё]/i.test(text)) return "ru";
  if (/[əğıİöüçş]/i.test(text)) return "az";
  return "en";
}
