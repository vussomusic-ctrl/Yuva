import { useTranslation } from "react-i18next";

export type LangCode = "az" | "ru" | "en";

// Autonyms — each written in its own language. NOT translated.
export const LANGUAGES: { code: LangCode; name: string }[] = [
  { code: "az", name: "Azərbaycan" },
  { code: "ru", name: "Русский" },
  { code: "en", name: "English" },
];

/**
 * Single source of truth for the app language. Both the Home header pill (cycle)
 * and the Profile picker (explicit choice) go through here, so they can never
 * drift apart — everything funnels into i18n.changeLanguage.
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const current: LangCode =
    LANGUAGES.find((l) => l.code === i18n.language)?.code ?? "az";

  const setLanguage = (code: LangCode) => {
    if (code !== current) i18n.changeLanguage(code);
  };

  const cycleLanguage = () => {
    const idx = LANGUAGES.findIndex((l) => l.code === current);
    setLanguage(LANGUAGES[(idx + 1) % LANGUAGES.length].code);
  };

  const currentName = LANGUAGES.find((l) => l.code === current)?.name ?? current;

  return { current, currentName, languages: LANGUAGES, setLanguage, cycleLanguage };
}
