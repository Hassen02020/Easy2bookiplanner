"use client"

/**
 * ChatInterface.tsx
 *
 * Composant d'interface de chat mobile-first pour Easy2Book.
 * - Utilise `h-dvh` pour éviter les bugs de viewport sur iOS/Android et webviews Facebook/TikTok.
 * - Style shadcn/ui minimaliste et tactile.
 * - Détection de la langue active (FR / EN / AR Derja) pour le miroir linguistique et le payload LLM.
 * - Accessible : bouton de saisie textuelle + bouton d'action contextuel (micro).
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LanguageSwitcher } from "@/components/language-switcher"
import { AudioRecorder } from "@/components/audio-recorder"
import { LeadForm } from "@/components/lead-form"

export type SupportedLanguage = "fr" | "en" | "ar"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  results?: unknown[]
}

interface SelectedBooking {
  serviceType: "hotel" | "flight" | "trip"
  destination: string
  calculatedPrice: string
  aiSummary: string
}

interface ChatInterfaceProps {
  className?: string
}

function detectLanguageForPayload(text: string): SupportedLanguage {
  // Détection simple par présence de caractères arabes ou mots Derja fréquents.
  const arabicRegex = /[\u0600-\u06FF]/
  if (arabicRegex.test(text)) return "ar"

  const derjaMarkers = [
    "chwaya",
    "chbih",
    "kifesh",
    "barcha",
    "sahbi",
    "yaatik",
    "sahha",
    "mchni",
    "akhtik",
    "wala",
  ]
  const lower = text.toLowerCase()
  if (derjaMarkers.some((marker) => lower.includes(marker))) return "ar"

  // Anglais : si la majorité des caractères sont latins et mots anglais simples.
  const englishMarkers = ["hello", "hi", "how much", "book", "flight", "hotel", "trip", "thanks"]
  if (englishMarkers.some((marker) => lower.includes(marker))) return "en"

  return "fr"
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("app.welcome"),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<SelectedBooking | null>(null)
  const [detectedLang, setDetectedLang] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || "fr"
  )
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fait défiler vers le dernier message à chaque ajout.
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages])

  // Synchronise la langue détectée avec i18n si nécessaire.
  useEffect(() => {
    const current = i18n.language as SupportedLanguage
    if (["fr", "en", "ar"].includes(current)) {
      setDetectedLang(current)
    }
  }, [i18n.language])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const inferredLang = detectLanguageForPayload(text)
    if (inferredLang !== detectedLang) {
      setDetectedLang(inferredLang)
      await i18n.changeLanguage(inferredLang)
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: "user",
      content: text,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          lang: inferredLang,
        }),
      })

      if (!response.ok) {
        throw new Error("Chat request failed")
      }

      const data = await response.json()
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: "assistant",
        content: data.content || t("errors.generic"),
        results: data.results,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: t("errors.generic"),
        },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [input, isLoading, messages, detectedLang, i18n, t])

  const handleTranscription = useCallback(
    async (text: string) => {
      setInput(text)
      // Petit délai pour permettre au state de se mettre à jour avant l'envoi.
      setTimeout(() => {
        handleSend()
      }, 50)
    },
    [handleSend]
  )

  return (
    <div
      className={cn(
        "flex h-dvh w-full flex-col overflow-hidden bg-background",
        className
      )}
      dir={detectedLang === "ar" ? "rtl" : "ltr"}
      role="region"
      aria-label="Conversation Easy2Book"
    >
      {/* En-tête fixe */}
      <header className="flex shrink-0 items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
            E2B
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">{t("app.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("app.subtitle")}</p>
          </div>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Zone de messages scrollable */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div key={message.id} className="space-y-3">
              <div
                className={cn(
                  "flex w-full",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>

              {message.role === "assistant" && message.results && message.results.length > 0 && (
                <div className="grid gap-3">
                  {message.results.map((result: any, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border bg-card p-4 shadow-sm"
                    >
                      <div className="font-semibold text-card-foreground">
                        {result.name || result.title}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {result.description}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">
                          {result.price}
                        </span>
                        <Button
                          size="sm"
                          onClick={() =>
                            setSelectedBooking({
                              serviceType: result.title ? "trip" : "hotel",
                              destination: result.destination || result.title || "Tunisie",
                              calculatedPrice:
                                result.price?.replace(/[^\d.,]/g, "").split(" ")[0] || "0.00",
                              aiSummary: message.content.slice(0, 120),
                            })
                          }
                        >
                          {t("chat.book_now")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedBooking && index === messages.length - 1 && message.role === "assistant" && (
                <div className="mt-4">
                  <LeadForm
                    serviceType={selectedBooking.serviceType}
                    destination={selectedBooking.destination}
                    calculatedPrice={selectedBooking.calculatedPrice}
                    aiSummary={selectedBooking.aiSummary}
                    onClose={() => setSelectedBooking(null)}
                  />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex w-full justify-start">
              <div className="flex max-w-[85%] items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t("chat.thinking")}</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </main>

      {/* Barre d'action fixe en bas */}
      <footer className="shrink-0 border-t bg-background p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1">
            <Input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={t("chat.placeholder")}
              aria-label="Message"
              className="h-12 rounded-full px-4"
            />
          </div>

          <AudioRecorder onTranscription={handleTranscription} />

          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            aria-label={t("chat.send")}
            className="h-12 w-12 rounded-full"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </footer>
    </div>
  )
}
