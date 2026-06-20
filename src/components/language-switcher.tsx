"use client"

import { useTranslation } from "react-i18next"
import { SUPPORTED_LANGUAGES, SupportedLanguage } from "@/lib/i18n/config"

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const currentLanguage = i18n.language as SupportedLanguage

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted p-1">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => i18n.changeLanguage(lang)}
          className={`px-3 py-1 text-sm font-medium rounded-full transition ${
            currentLanguage === lang
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={t(`language.${lang}`)}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
