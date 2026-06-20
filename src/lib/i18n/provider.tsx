"use client"

import { ReactNode, useEffect } from "react"
import { useTranslation } from "react-i18next"
import "./config"

export function I18nProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()

  useEffect(() => {
    const html = document.documentElement
    const lang = i18n.language as "fr" | "en" | "ar"
    html.lang = lang
    html.dir = lang === "ar" ? "rtl" : "ltr"
  }, [i18n.language])

  return <>{children}</>
}
