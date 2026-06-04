import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import az from "./locales/az.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

const deviceLang = Localization.getLocales()[0]?.languageCode ?? "az";
const supportedLangs = ["az", "ru", "en"];
const defaultLang = supportedLangs.includes(deviceLang) ? deviceLang : "az";

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

export default i18n;
