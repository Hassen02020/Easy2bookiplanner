import { db } from "@/db"
import { inboundTrips } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * airportConcierge.ts
 *
 * Moteur de conciergerie "Airport-to-Airport" pour Easy2Book Inbound & MICE.
 * Assemble automatiquement les détails logistiques d'un invité étranger,
 * génère un code PIN de sécurité et prépare le message WhatsApp de bienvenue.
 */

export interface AirportManifest {
  tripId: string
  passengerName: string
  countryOrigin: string | null
  flightNumber: string | null
  arrivalTime: Date | null
  departureTime: Date | null
  airportCode: "TUN" | "NBE" | "MIR" | null
  airportName: string
  terminalPickup: string
  assignedDriverId: string | null
  securityPin: string
  whatsappMessage?: string
  trackingLink: string
  language: string
}

const AIRPORT_NAMES: Record<string, string> = {
  TUN: "Tunis-Carthage International Airport",
  NBE: "Enfidha-Hammamet International Airport",
  MIR: "Monastir Habib Bourguiba International Airport",
}

const TERMINAL_PICKUP: Record<string, string> = {
  TUN: "Sortie terminaux principaux - Hall VIP Easy2Book",
  NBE: "Sortie terminal principal - Comptoir Easy2Book",
  MIR: "Sortie aérogare - Zone de prise en charge hôtels",
}

export function generateSecurityPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export function formatFlightTime(date: Date | null, locale: string = "fr-FR"): string {
  if (!date) return "À confirmer"
  return date.toLocaleString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function generateWelcomeMessage(manifest: AirportManifest): string {
  const locale = manifest.language === "fr" ? "fr-FR" : "en-US"
  const airportName = manifest.airportName
  const pickup = manifest.terminalPickup
  const arrival = formatFlightTime(manifest.arrivalTime, locale)
  const pin = manifest.securityPin

  if (manifest.language === "fr") {
    return (
      `Bienvenue en Tunisie, ${manifest.passengerName} !\n\n` +
      `Votre vol ${manifest.flightNumber || "N/A"} arrive à ${arrival} à ${airportName}.\n` +
      `Votre chauffeur Easy2Book vous attend à : ${pickup}.\n` +
      `Code de sécurité chauffeur : *${pin}*\n` +
      `Suivi en direct : ${manifest.trackingLink}\n\n` +
      `En cas d'urgence, contactez votre assistance locale.`
    )
  }

  return (
    `Welcome to Tunisia, ${manifest.passengerName}!\n\n` +
    `Your flight ${manifest.flightNumber || "N/A"} arrives at ${arrival} at ${airportName}.\n` +
    `Your Easy2Book driver will meet you at: ${pickup}.\n` +
    `Security PIN: *${pin}*\n` +
    `Live tracking: ${manifest.trackingLink}\n\n` +
    `In case of emergency, contact your local assistance.`
  )
}

export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  const cleanNumber = phoneNumber.replace(/\D/g, "")
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`
}

/**
 * Récupère ou crée un manifeste airport-to-airport pour un trip.
 */
export async function generateAirportManifest(tripId: string): Promise<AirportManifest | null> {
  const existing = await db
    .select()
    .from(inboundTrips)
    .where(eq(inboundTrips.clientTripId, tripId))
    .limit(1)

  if (existing.length === 0) {
    return null
  }

  const trip = existing[0]
  const airportCode = trip.airportCode

  const manifest: AirportManifest = {
    tripId,
    passengerName: trip.userPassportName,
    countryOrigin: trip.countryOrigin,
    flightNumber: trip.flightNumber,
    arrivalTime: trip.arrivalTime,
    departureTime: trip.departureTime,
    airportCode,
    airportName: airportCode ? AIRPORT_NAMES[airportCode] : "Airport to be confirmed",
    terminalPickup: airportCode ? TERMINAL_PICKUP[airportCode] : "Pickup location to be confirmed",
    assignedDriverId: trip.assignedDriverId,
    securityPin: trip.securityPin,
    trackingLink: `${process.env.NEXT_PUBLIC_APP_URL || "https://easy2book.tn"}/trip/${tripId}/track`,
    language: trip.language,
  }

  manifest.whatsappMessage = generateWelcomeMessage(manifest)

  return manifest
}

/**
 * Crée un nouvel enregistrement inbound trip avec PIN et chauffeur.
 */
export async function createInboundTrip(input: {
  clientTripId: string
  userPassportName: string
  countryOrigin?: string
  flightNumber?: string
  arrivalTime?: Date
  departureTime?: Date
  airportCode?: "TUN" | "NBE" | "MIR"
  assignedDriverId?: string
  tripType?: "mice" | "medical" | "event" | "leisure"
  language?: string
}): Promise<string> {
  const securityPin = generateSecurityPin()

  const inserted = await db
    .insert(inboundTrips)
    .values({
      clientTripId: input.clientTripId,
      userPassportName: input.userPassportName,
      countryOrigin: input.countryOrigin || null,
      flightNumber: input.flightNumber || null,
      arrivalTime: input.arrivalTime || null,
      departureTime: input.departureTime || null,
      airportCode: input.airportCode || null,
      assignedDriverId: input.assignedDriverId || null,
      securityPin,
      tripType: input.tripType || "leisure",
      language: input.language || "en",
    })
    .returning({ id: inboundTrips.id })

  return inserted[0].id
}

/**
 * Vérifie si le PIN de sécurité est correct pour un chauffeur donné.
 */
export async function verifySecurityPin(
  tripId: string,
  driverId: string,
  pin: string
): Promise<boolean> {
  const rows = await db
    .select({ securityPin: inboundTrips.securityPin, assignedDriverId: inboundTrips.assignedDriverId })
    .from(inboundTrips)
    .where(eq(inboundTrips.clientTripId, tripId))
    .limit(1)

  if (rows.length === 0) return false
  return rows[0].assignedDriverId === driverId && rows[0].securityPin === pin
}
