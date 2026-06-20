"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { SupportedLanguage } from "@/lib/db/search"
import { Send, Loader2 } from "lucide-react"
import { AudioRecorder } from "./audio-recorder"
import { LeadForm } from "./lead-form"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  results?: unknown[]
}

interface ApiResponse {
  content: string | null
  results?: unknown[]
}

interface SelectedBooking {
  serviceType: "hotel" | "flight" | "trip"
  destination: string
  calculatedPrice: string
  aiSummary: string
}

export function Chat() {
  const { t, i18n } = useTranslation()
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: t("app.welcome") },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<SelectedBooking | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: ChatMessage = { role: "user", content: text }
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
          lang: (i18n.language || "fr") as SupportedLanguage,
        }),
      })

      if (!response.ok) {
        throw new Error("Chat request failed")
      }

      const data: ApiResponse = await response.json()
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content || t("errors.generic"), results: data.results },
      ])
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("errors.generic") },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleTranscription = (text: string) => {
    setInput(text)
    sendMessage(text)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className="space-y-3">
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                message.role === "user"
                  ? "ms-auto bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>

            {message.results && message.results.length > 0 && (
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
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedBooking({
                            serviceType: result.title ? "trip" : "hotel",
                            destination: result.destination || result.title || "Tunisie",
                            calculatedPrice: result.price?.replace(/[^\d.,]/g, "").split(" ")[0] || "0.00",
                            aiSummary: message.content.slice(0, 120),
                          })
                        }
                        className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
                      >
                        {t("chat.book_now")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedBooking && index === messages.length - 1 && (
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("chat.thinking")}
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder={t("chat.placeholder")}
            className="flex-1 rounded-full border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <AudioRecorder onTranscription={handleTranscription} />
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 transition disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
