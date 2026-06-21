"use client"

/**
 * TripBook.tsx
 *
 * Composant d'affichage du Live Trip-Book personnalisé Easy2Book.
 * - Mobile-first avec h-dvh.
 * - Itinéraire jour par jour structuré (Matin, Midi, Après-midi, Soir).
 * - International : logistique aéroport, PIN chauffeur, timeline MICE/médical.
 * - Boutons d'action rapide fixes en bas : guide, chat, acompte.
 */

import Link from "next/link"
import { useState, useEffect } from "react"
import {
  MapPin,
  MessageCircle,
  User,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Star,
  ArrowLeft,
  Plane,
  Shield,
  Phone,
  Calendar,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AirportManifest } from "@/utils/airportConcierge"

interface ItineraryDay {
  day: number
  morning: string
  midday: string
  afternoon: string
  evening: string
  estimatedCost?: string | null
}

interface ItineraryPlan {
  title?: string
  subtitle?: string
  days: ItineraryDay[]
  totalEstimatedCost?: string
  valueForMoneyScore?: number
  timeline?: Array<{ time: string; label: string; type: string }>
}

interface TripBookProps {
  id: string
  title: string
  subtitle?: string | null
  destination: string
  category: string
  calculatedPrice?: string | null
  totalEstimatedCost?: string | null
  valueForMoneyScore?: number | null
  itinerary: unknown
  inboundManifest?: AirportManifest | null
  tripType?: "mice" | "medical" | "event" | "leisure"
}

const TRANSLATIONS = {
  fr: {
    price: "Prix indicatif",
    logistics: "Ma Logistique",
    flight: "Vol",
    arrival: "Arrivée",
    departure: "Départ",
    airport: "Aéroport",
    pickup: "Point de prise en charge",
    driverPin: "PIN chauffeur",
    assistance: "Appeler mon assistance",
    timeline: "Mon programme",
    guide: "Guide",
    modify: "Modifier",
    deposit: "Acompte",
    noItinerary: "Aucun itinéraire détaillé disponible pour ce voyage.",
  },
  en: {
    price: "Indicative price",
    logistics: "My Logistics",
    flight: "Flight",
    arrival: "Arrival",
    departure: "Departure",
    airport: "Airport",
    pickup: "Pickup location",
    driverPin: "Driver PIN",
    assistance: "Call my assistance",
    timeline: "My schedule",
    guide: "Guide",
    modify: "Modify",
    deposit: "Deposit",
    noItinerary: "No detailed itinerary available for this trip.",
  },
}

type Language = "fr" | "en"

export function TripBook({
  id,
  title,
  subtitle,
  destination,
  category,
  calculatedPrice,
  totalEstimatedCost,
  valueForMoneyScore,
  itinerary,
  inboundManifest,
  tripType = "leisure",
}: TripBookProps) {
  const [openDays, setOpenDays] = useState<number[]>([1])
  const [language, setLanguage] = useState<Language>("fr")

  useEffect(() => {
    const browserLang = navigator.language?.slice(0, 2)
    if (browserLang === "en") setLanguage("en")
    if (inboundManifest?.language === "fr") setLanguage("fr")
    if (inboundManifest?.language === "en") setLanguage("en")
  }, [inboundManifest?.language])

  const t = TRANSLATIONS[language]

  const plan = itinerary as ItineraryPlan | null
  const days = plan?.days || []
  const timeline = plan?.timeline || []

  const toggleDay = (day: number) => {
    setOpenDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "21600000000"
  const guideMessage = encodeURIComponent(
    language === "fr"
      ? `Bonjour, je consulte mon Trip-Book #${id} pour ${destination}. Pouvez-vous me mettre en relation avec mon guide local ?`
      : `Hello, I am viewing my Trip-Book #${id} for ${destination}. Can you connect me with my local guide?`
  )
  const modifyMessage = encodeURIComponent(
    language === "fr"
      ? `Bonjour, je souhaite modifier l'itinéraire de mon Trip-Book #${id} pour ${destination}.`
      : `Hello, I would like to modify my Trip-Book #${id} for ${destination}.`
  )
  const depositMessage = encodeURIComponent(
    language === "fr"
      ? `Bonjour, je suis prêt à payer l'acompte pour mon Trip-Book #${id} (${destination}).`
      : `Hello, I am ready to pay the deposit for my Trip-Book #${id} (${destination}).`
  )

  const isInternational = tripType !== "leisure"

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="shrink-0 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base font-semibold leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
            className="flex h-8 items-center gap-1 rounded-full bg-muted px-2 text-xs font-medium"
          >
            <Globe className="h-3.5 w-3.5" />
            {language.toUpperCase()}
          </button>
        </div>
      </header>

      {/* Hero summary */}
      <section className="shrink-0 border-b bg-gradient-to-br from-primary/10 to-background p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="capitalize">{destination}</span>
          <Badge variant="secondary" className="ml-2 text-xs">
            {category}
          </Badge>
          {isInternational && (
            <Badge variant="outline" className="text-xs uppercase">
              {tripType}
            </Badge>
          )}
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{t.price}</div>
            <div className="text-2xl font-bold text-primary">
              {calculatedPrice ? `${calculatedPrice} TND` : totalEstimatedCost || "Sur devis"}
            </div>
          </div>
          {valueForMoneyScore ? (
            <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
              <Star className="h-3.5 w-3.5 fill-amber-600" />
              VFM {valueForMoneyScore}/10
            </div>
          ) : null}
        </div>
      </section>

      {/* Itinerary scrollable */}
      <main className="flex-1 overflow-y-auto overscroll-y-contain p-4 space-y-4">
        {/* International logistics */}
        {isInternational && inboundManifest && (
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t.logistics}</h3>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.flight}</span>
                  <span className="font-medium">{inboundManifest.flightNumber || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.arrival}</span>
                  <span className="font-medium">
                    {inboundManifest.arrivalTime
                      ? new Date(inboundManifest.arrivalTime).toLocaleString(language)
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.departure}</span>
                  <span className="font-medium">
                    {inboundManifest.departureTime
                      ? new Date(inboundManifest.departureTime).toLocaleString(language)
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.airport}</span>
                  <span className="font-medium">{inboundManifest.airportCode || "N/A"}</span>
                </div>
                <div className="pt-2 text-xs text-muted-foreground">
                  {t.pickup}: {inboundManifest.terminalPickup}
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">
                    {t.driverPin}: {inboundManifest.securityPin}
                  </span>
                </div>
              </div>

              <Button className="mt-3 w-full" size="sm" asChild>
                <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(language === "fr" ? "Assistance locale" : "Local assistance")}`} target="_blank" rel="noreferrer">
                  <Phone className="mr-2 h-4 w-4" />
                  {t.assistance}
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Timeline for MICE / medical */}
        {isInternational && timeline.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">{t.timeline}</h3>
              </div>
              <div className="relative space-y-4 pl-4">
                {timeline.map((item, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-4 top-1 h-2 w-2 rounded-full bg-primary" />
                    {index !== timeline.length - 1 && (
                      <div className="absolute -left-[13px] top-3 h-full w-px bg-border" />
                    )}
                    <div className="text-xs font-medium text-muted-foreground">{item.time}</div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-muted-foreground capitalize">{item.type}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {days.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground">
            {t.noItinerary}
          </div>
        ) : (
          <div className="space-y-3">
            {days.map((day) => {
              const isOpen = openDays.includes(day.day)
              return (
                <Card key={day.day} className="overflow-hidden">
                  <button
                    onClick={() => toggleDay(day.day)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {day.day}
                      </div>
                      <span className="font-medium">Jour {day.day}</span>
                    </div>
                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>

                  {isOpen && (
                    <CardContent className="space-y-3 border-t pb-4 pt-3">
                      <MomentBlock icon={Sun} label="Matin" text={day.morning} />
                      <MomentBlock icon={Utensils} label="Midi" text={day.midday} />
                      <MomentBlock icon={Footprints} label="Après-midi" text={day.afternoon} />
                      <MomentBlock icon={Moon} label="Soir" text={day.evening} />
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Fixed bottom actions */}
      <footer className="shrink-0 border-t bg-background p-3">
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="flex-col gap-1 h-auto py-2" asChild>
            <a href={`https://wa.me/${whatsappNumber}?text=${guideMessage}`} target="_blank" rel="noreferrer">
              <User className="h-4 w-4" />
              <span className="text-xs">{t.guide}</span>
            </a>
          </Button>
          <Button variant="outline" size="sm" className="flex-col gap-1 h-auto py-2" asChild>
            <a href={`https://wa.me/${whatsappNumber}?text=${modifyMessage}`} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{t.modify}</span>
            </a>
          </Button>
          <Button size="sm" className="flex-col gap-1 h-auto py-2" asChild>
            <a href={`https://wa.me/${whatsappNumber}?text=${depositMessage}`} target="_blank" rel="noreferrer">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs">{t.deposit}</span>
            </a>
          </Button>
        </div>
      </footer>
    </div>
  )
}

function MomentBlock({
  icon: Icon,
  label,
  text,
}: {
  icon: React.ElementType
  label: string
  text: string
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <p className="text-sm text-foreground">{text}</p>
      </div>
    </div>
  )
}

function Sun(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function Moon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function Utensils(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  )
}

function Footprints(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" />
      <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" />
      <path d="M16 17h4" />
      <path d="M4 13h4" />
    </svg>
  )
}
