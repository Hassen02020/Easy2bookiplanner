import { db } from "@/db"
import { hotels, packageInventory, organizedTrips } from "@/db/schema"
import { eq, and, gte } from "drizzle-orm"
import { calculateDisplayPrice } from "@/lib/pricing"
import { isPassMember } from "@/lib/services/loyaltyService"

/**
 * budgetMatcher.ts
 *
 * Moteur d'inversion budgétaire pour Easy2Book.
 * À partir d'un budget maximum, scanne les hôtels, voyages organisés et packages
 * alternatifs actifs, applique le pricing engine et retourne les meilleures
 * combinaisons accessibles au voyageur tunisien.
 */

export type BudgetMatchType = "hotel" | "trip" | "alternative"

export interface BudgetMatch {
  id: string
  type: BudgetMatchType
  name: string
  destination: string
  category: string
  basePrice: number
  finalPrice: number
  savings: number
  details: string
  available: boolean
  urgency: boolean
  remainingSlots: number | null
}

interface BudgetOptions {
  maxBudget: number
  category?: string
  nights?: number
  destination?: string
  userPhone?: string
}

/**
 * Recherche les séjours hôteliers disponibles dans le budget.
 */
async function findHotelsWithinBudget(
  maxBudget: number,
  nights: number = 3,
  destination?: string,
  isPassMember: boolean = false
): Promise<BudgetMatch[]> {
  const conditions = [eq(hotels.isActive, true)]
  if (destination) {
    conditions.push(eq(hotels.destination, destination))
  }

  const rows = await db
    .select({
      id: hotels.id,
      destination: hotels.destination,
      stars: hotels.stars,
      basePricePerNight: hotels.basePricePerNight,
    })
    .from(hotels)
    .where(and(...conditions))

  const matches: BudgetMatch[] = []

  for (const row of rows) {
    const basePrice = Number(row.basePricePerNight) * nights
    const finalPrice = await calculateDisplayPrice("hotel", basePrice, row.destination, "hotel", isPassMember)

    if (finalPrice <= maxBudget) {
      matches.push({
        id: row.id,
        type: "hotel",
        name: `Hôtel ${row.stars}★ à ${row.destination}`,
        destination: row.destination,
        category: "hotel",
        basePrice,
        finalPrice,
        savings: Math.max(0, basePrice - finalPrice),
        details: `${nights} nuits, ${row.stars} étoiles`,
        available: true,
        urgency: false,
        remainingSlots: null,
      })
    }
  }

  return matches.sort((a, b) => b.savings - a.savings)
}

/**
 * Recherche les voyages organisés et packages alternatifs disponibles.
 */
async function findPackagesWithinInventory(
  maxBudget: number,
  destination?: string,
  isPassMember: boolean = false
): Promise<BudgetMatch[]> {
  const conditions = [eq(packageInventory.isSoldOut, false)]
  if (destination) {
    conditions.push(eq(packageInventory.destination, destination))
  }

  const rows = await db
    .select({
      id: packageInventory.id,
      packageName: packageInventory.packageName,
      destination: packageInventory.destination,
      category: packageInventory.category,
      totalSlots: packageInventory.totalSlots,
      bookedSlots: packageInventory.bookedSlots,
      thresholdUrgency: packageInventory.thresholdUrgency,
    })
    .from(packageInventory)
    .where(and(...conditions))

  const matches: BudgetMatch[] = []

  for (const row of rows) {
    const category = row.category || "generic"
    const serviceType: "hotel" | "flight" | "trip" = category === "hotel" ? "hotel" : "trip"
    const basePrice = category === "hotel" ? 320 : 1890
    const finalPrice = await calculateDisplayPrice(serviceType, basePrice, row.destination, category, isPassMember)

    if (finalPrice <= maxBudget) {
      const remaining = row.totalSlots - row.bookedSlots
      matches.push({
        id: row.id,
        type: category === "alternative" || category === "explorer" ? "alternative" : "trip",
        name: row.packageName,
        destination: row.destination || "Tunisie",
        category,
        basePrice,
        finalPrice,
        savings: Math.max(0, basePrice - finalPrice),
        details: `${remaining} places restantes`,
        available: remaining > 0,
        urgency: remaining > 0 && remaining <= row.thresholdUrgency,
        remainingSlots: remaining,
      })
    }
  }

  return matches.sort((a, b) => b.savings - a.savings)
}

/**
 * Recherche les voyages organisés prédéfinis dans le budget.
 */
async function findOrganizedTripsWithinBudget(
  maxBudget: number,
  destination?: string,
  isPassMember: boolean = false
): Promise<BudgetMatch[]> {
  const rows = await db
    .select({
      id: organizedTrips.id,
      price: organizedTrips.price,
      departureDate: organizedTrips.departureDate,
      returnDate: organizedTrips.returnDate,
      availableSeats: organizedTrips.availableSeats,
    })
    .from(organizedTrips)
    .where(gte(organizedTrips.availableSeats, 1))

  const matches: BudgetMatch[] = []

  for (const row of rows) {
    const basePrice = Number(row.price)
    const finalPrice = await calculateDisplayPrice("trip", basePrice, destination, "voyage", isPassMember)

    if (finalPrice <= maxBudget) {
      matches.push({
        id: row.id,
        type: "trip",
        name: `Voyage organisé du ${formatDate(row.departureDate)} au ${formatDate(row.returnDate)}`,
        destination: destination || "International",
        category: "voyage",
        basePrice,
        finalPrice,
        savings: Math.max(0, basePrice - finalPrice),
        details: `${row.availableSeats} places restantes`,
        available: row.availableSeats > 0,
        urgency: row.availableSeats <= 3,
        remainingSlots: row.availableSeats,
      })
    }
  }

  return matches.sort((a, b) => b.savings - a.savings)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

/**
 * Point d'entrée principal : retourne les meilleures combinaisons accessibles
 * dans le budget de l'utilisateur.
 */
export async function findPackagesWithinBudget(
  options: BudgetOptions
): Promise<BudgetMatch[]> {
  const { maxBudget, category, nights = 3, destination, userPhone } = options

  const passMember = userPhone ? await isPassMember(userPhone) : false

  const hotelMatches = category && category !== "hotel" ? [] : await findHotelsWithinBudget(maxBudget, nights, destination, passMember)
  const tripMatches =
    category && category !== "trip" && category !== "voyage"
      ? []
      : await findPackagesWithinInventory(maxBudget, destination, passMember)
  const organizedMatches =
    category && category !== "trip" && category !== "voyage"
      ? []
      : await findOrganizedTripsWithinBudget(maxBudget, destination, passMember)

  const all = [...hotelMatches, ...tripMatches, ...organizedMatches]

  return all
    .sort((a, b) => {
      // Priorité : plus grande économie, puis prix final croissant
      if (b.savings !== a.savings) return b.savings - a.savings
      return a.finalPrice - b.finalPrice
    })
    .slice(0, 10)
}

/**
 * Retourne les meilleures combinaisons compatibles avec une structure familiale.
 */
export async function findFamilyPackagesWithinBudget(
  maxBudget: number,
  adults: number,
  children: number,
  destination?: string
): Promise<BudgetMatch[]> {
  // Multiplicateur simplifié : les enfants comptent 0.6x un adulte
  const equivalentAdults = adults + children * 0.6
  const adjustedBudget = maxBudget / Math.max(1, equivalentAdults)

  return findPackagesWithinBudget({
    maxBudget: adjustedBudget,
    destination,
  })
}
