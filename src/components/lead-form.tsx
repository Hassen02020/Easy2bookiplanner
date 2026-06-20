"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { submitLead, LeadInput } from "@/lib/actions/lead"
import { normalizePhone } from "@/lib/phone"
import { trackClientPixel, sendServerCapiEvent, generateEventId } from "@/lib/meta"

interface LeadFormProps {
  serviceType: "hotel" | "flight" | "trip"
  destination: string
  calculatedPrice: string
  aiSummary: string
  onClose: () => void
}

export function LeadForm({ serviceType, destination, calculatedPrice, aiSummary, onClose }: LeadFormProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    period: "",
    participants: "1 adulte",
  })
  const [error, setError] = useState<string | null>(null)
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const eventId = generateEventId()

      const result = await submitLead({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: normalizePhone(form.phone),
        serviceType,
        destination,
        period: form.period || "Non précisée",
        participants: form.participants || "Non précisé",
        calculatedPrice,
        aiSummary,
      })

      trackClientPixel({
        eventName: "Lead",
        eventId,
        email: form.email,
        phone: normalizePhone(form.phone),
        firstName: form.firstName,
        lastName: form.lastName,
        contentName: destination,
        contentCategory: serviceType,
      })

      await sendServerCapiEvent({
        eventName: "Lead",
        eventId,
        email: form.email,
        phone: normalizePhone(form.phone),
        firstName: form.firstName,
        lastName: form.lastName,
        contentName: destination,
        contentCategory: serviceType,
      })

      setWhatsappLink(result.whatsappLink)
    } catch (err) {
      console.error(err)
      setError(t("errors.generic"))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (whatsappLink) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-card-foreground mb-2">
          {t("lead.whatsapp_redirect")}
        </h3>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-green-600 px-6 py-3 text-white font-medium hover:bg-green-700 transition"
        >
          Ouvrir WhatsApp
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm animate-in slide-in-from-bottom-4">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">{t("lead.title")}</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            required
            placeholder={t("lead.first_name")}
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            required
            placeholder={t("lead.last_name")}
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <input
          type="email"
          required
          placeholder={t("lead.email")}
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <input
          type="tel"
          required
          placeholder={t("lead.phone")}
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <input
          type="text"
          placeholder="Période souhaitée"
          value={form.period}
          onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        <input
          type="text"
          placeholder="Participants"
          value={form.participants}
          onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t("lead.submit")}
          </button>
        </div>
      </form>
    </div>
  )
}
