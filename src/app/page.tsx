"use client"

import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Chat } from "@/components/chat"
import { BRAND_CONFIG } from "@/config/brand"

export default function Home() {
  const { t } = useTranslation()

  return (
    <main className="h-dvh flex flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-bold">{BRAND_CONFIG.name || t("app.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("app.subtitle")}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <Chat />
    </main>
  )
}
