import { db } from "@/db"
import { hotels, hotelTranslations, organizedTrips, organizedTripTranslations } from "@/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"
import { calculateDisplayPrice } from "@/lib/pricing"

export type SupportedLanguage = "fr" | "ar" | "en"

export interface HotelResult {
  id: string
  name: string
  description: string | null
  stars: number
  destination: string
  basePricePerNight: number
  displayPrice: number
  amenities: unknown
}

export interface TripResult {
  id: string
  title: string
  description: string | null
  departureDate: Date
  returnDate: Date
  price: number
  displayPrice: number
  availableSeats: number
  includedServices: unknown
}

export async function searchHotels(
  destination: string,
  language: SupportedLanguage,
  stars?: number
): Promise<HotelResult[]> {
  const conditions = [
    eq(hotels.isActive, true),
    eq(hotelTranslations.language, language),
    sql`${hotels.destination} ILIKE ${`%${destination}%`}`,
  ]

  if (stars) {
    conditions.push(sql`${hotels.stars} >= ${stars}`)
  }

  const results = await db
    .select({
      id: hotels.id,
      name: hotelTranslations.name,
      description: hotelTranslations.description,
      stars: hotels.stars,
      destination: hotels.destination,
      basePricePerNight: hotels.basePricePerNight,
      amenities: hotelTranslations.amenitiesTranslated,
    })
    .from(hotels)
    .innerJoin(hotelTranslations, eq(hotels.id, hotelTranslations.hotelId))
    .where(and(...conditions))

  return Promise.all(
    results.map(async (hotel) => {
      const rawPrice = Number(hotel.basePricePerNight)
      const displayPrice = await calculateDisplayPrice("hotel", rawPrice, hotel.destination, "hotel")
      return {
        ...hotel,
        basePricePerNight: rawPrice,
        displayPrice,
      }
    })
  )
}

export async function searchTrips(
  destination: string,
  language: SupportedLanguage,
  type?: string
): Promise<TripResult[]> {
  const results = await db
    .select({
      id: organizedTrips.id,
      title: organizedTripTranslations.title,
      description: organizedTripTranslations.description,
      departureDate: organizedTrips.departureDate,
      returnDate: organizedTrips.returnDate,
      price: organizedTrips.price,
      availableSeats: organizedTrips.availableSeats,
      includedServices: organizedTripTranslations.includedServices,
    })
    .from(organizedTrips)
    .innerJoin(organizedTripTranslations, eq(organizedTrips.id, organizedTripTranslations.tripId))
    .where(
      and(
        eq(organizedTripTranslations.language, language),
        gte(organizedTrips.availableSeats, 1),
        sql`${organizedTripTranslations.title} ILIKE ${`%${destination}%`}`
      )
    )

  return Promise.all(
    results.map(async (trip) => {
      const rawPrice = Number(trip.price)
      const category = inferCategoryFromDestination(destination)
      const displayPrice = await calculateDisplayPrice("trip", rawPrice, destination, category)
      return {
        ...trip,
        price: rawPrice,
        displayPrice,
      }
    })
  )
}

function inferCategoryFromDestination(destination: string): string {
  const lower = destination.toLowerCase()
  if (lower.includes("omra")) return "omra"
  if (lower.includes("istanbul")) return "istanbul"
  if (lower.includes("turquie") || lower.includes("turkey")) return "turkey"
  return "generic"
}
