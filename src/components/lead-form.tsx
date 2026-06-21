"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { submitLead } from "@/lib/actions/lead"
import { normalizePhone } from "@/lib/phone"
import { leadFormSchema, type LeadFormData } from "@/lib/validation"
import { trackClientPixel, sendServerCapiEvent, generateEventId } from "@/lib/meta"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface LeadFormProps {
  serviceType: "hotel" | "flight" | "trip"
  destination: string
  calculatedPrice: string
  aiSummary: string
  remainingSlots?: number | null
  onClose: () => void
}

export function LeadForm({ serviceType, destination, calculatedPrice, aiSummary, remainingSlots, onClose }: LeadFormProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      period: "",
      participants: "1 adulte",
    },
  })

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const normalizedPhone = normalizePhone(data.phone)

      const result = await submitLead({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: normalizedPhone,
        serviceType,
        destination,
        period: data.period || "Non précisée",
        participants: data.participants || "Non précisé",
        calculatedPrice,
        remainingSlots,
        aiSummary,
      })

      const numericPrice = parseFloat(calculatedPrice) || 0
      const payload = {
        email: data.email,
        phone: normalizedPhone,
        firstName: data.firstName,
        lastName: data.lastName,
        contentName: destination,
        contentCategory: serviceType,
        value: numericPrice,
        currency: "TND",
      }

      // Lead
      const leadEventId = generateEventId()
      trackClientPixel({ ...payload, eventName: "Lead", eventId: leadEventId })
      sendServerCapiEvent({ ...payload, eventName: "Lead", eventId: leadEventId }).catch((e) =>
        console.error("[Lead CAPI]", e)
      )

      // InitiateCheckout : intention de paiement forte
      const checkoutEventId = generateEventId()
      trackClientPixel({ ...payload, eventName: "InitiateCheckout", eventId: checkoutEventId })
      sendServerCapiEvent({ ...payload, eventName: "InitiateCheckout", eventId: checkoutEventId }).catch((e) =>
        console.error("[InitiateCheckout CAPI]", e)
      )

      // Purchase : engagement financier
      const purchaseEventId = generateEventId()
      trackClientPixel({ ...payload, eventName: "Purchase", eventId: purchaseEventId })
      sendServerCapiEvent({ ...payload, eventName: "Purchase", eventId: purchaseEventId }).catch((e) =>
        console.error("[Purchase CAPI]", e)
      )

      setWhatsappLink(result.whatsappLink)
    } catch (err) {
      console.error(err)
      setSubmitError(t("errors.generic"))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (whatsappLink) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="text-lg">{t("lead.whatsapp_redirect")}</CardTitle>
        </CardHeader>
        <CardContent>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 transition"
          >
            Ouvrir WhatsApp
          </a>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-in slide-in-from-bottom-4">
      <CardHeader>
        <CardTitle className="text-lg">Confirmer et bloquer votre tarif</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName">{t("lead.first_name")}</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">{t("lead.last_name")}</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">{t("lead.email")}</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">{t("lead.phone")}</Label>
            <Input id="phone" type="tel" placeholder="+216 21 234 567" {...register("phone")} />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="period">Période souhaitée</Label>
            <Input id="period" {...register("period")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="participants">Participants</Label>
            <Input id="participants" {...register("participants")} />
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Confirmer et Bloquer mon Tarif"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
