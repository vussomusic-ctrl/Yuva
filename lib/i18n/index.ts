import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import az from "./locales/az.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

export const LANGUAGE_KEY = "app_language";

const supportedLangs = ["az", "ru", "en"];
const defaultLang = "az";

// Sync init on the system language (→ az fallback) so importers get i18n now.
i18n.use(initReactI18next).init({
  resources: {
    az: { translation: az },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: defaultLang,
  fallbackLng: "az",
  interpolation: { escapeValue: false },
});

// Then async-apply a previously saved choice (persisted in setLanguage) — it
// wins over the system default. No-op if absent/unsupported/already active.
AsyncStorage.getItem(LANGUAGE_KEY)
  .then((saved) => {
    if (saved && supportedLangs.includes(saved) && saved !== i18n.language) {
      i18n.changeLanguage(saved);
    }
  })
  .catch(() => {});

export default i18n;
