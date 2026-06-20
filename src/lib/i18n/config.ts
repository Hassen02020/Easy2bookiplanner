import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import fr from "./locales/fr.json"
import en from "./locales/en.json"
import ar from "./locales/ar.json"

export const SUPPORTED_LANGUAGES = ["fr", "en", "ar"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  ar: { translation: ar },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "fr",
    lng: "fr",
    debug: process.env.NODE_ENV === "development",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "e2b_language",
    },
  })

export default i18n
