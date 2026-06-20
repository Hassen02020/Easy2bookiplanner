import { db } from "@/db"
import { packageInventory } from "@/db/schema"
import { eq, sql } from "drizzle-orm"

/**
 * inventory.ts
 *
 * Gestion des stocks de voyages pour Easy2Book.
 * - checkAvailability : calcule la disponibilité en temps réel.
 * - bookSlots : décrémente les places de manière sécurisée via transaction SQL.
 */

export interface AvailabilityResult {
  available: boolean
  triggerUrgence: boolean
  remaining: number
  total: number
  isSoldOut: boolean
  notFound: boolean
}

export interface BookingResult {
  success: boolean
  remaining: number
  message: string
}

export async function checkAvailability(packageId: string): Promise<AvailabilityResult> {
  const rows = await db
    .select({
      id: packageInventory.id,
      totalSlots: packageInventory.totalSlots,
      bookedSlots: packageInventory.bookedSlots,
      thresholdUrgency: packageInventory.thresholdUrgency,
      isSoldOut: packageInventory.isSoldOut,
    })
    .from(packageInventory)
    .where(eq(packageInventory.id, packageId))
    .limit(1)

  if (rows.length === 0) {
    return {
      available: false,
      triggerUrgence: false,
      remaining: 0,
      total: 0,
      isSoldOut: false,
      notFound: true,
    }
  }

  const row = rows[0]
  const remaining = Math.max(0, row.totalSlots - row.bookedSlots)
  const triggerUrgence = remaining > 0 && remaining <= row.thresholdUrgency
  const available = remaining > 0 && !row.isSoldOut

  return {
    available,
    triggerUrgence,
    remaining,
    total: row.totalSlots,
    isSoldOut: row.isSoldOut,
    notFound: false,
  }
}

export async function bookSlots(
  packageId: string,
  slots: number = 1
): Promise<BookingResult> {
  if (slots <= 0) {
    return {
      success: false,
      remaining: 0,
      message: "Le nombre de places à réserver doit être supérieur à zéro.",
    }
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Verrouillage SELECT FOR UPDATE pour éviter les conditions de course.
      const rows = await tx
        .select({
          id: packageInventory.id,
          totalSlots: packageInventory.totalSlots,
          bookedSlots: packageInventory.bookedSlots,
        })
        .from(packageInventory)
        .where(eq(packageInventory.id, packageId))
        .for("update")
        .limit(1)

      if (rows.length === 0) {
        return {
          success: false,
          remaining: 0,
          message: "Package introuvable.",
        }
      }

      const row = rows[0]
      const remaining = row.totalSlots - row.bookedSlots

      if (remaining < slots) {
        return {
          success: false,
          remaining: Math.max(0, remaining),
          message: "Places insuffisantes pour cette réservation.",
        }
      }

      const newBooked = row.bookedSlots + slots
      const isSoldOut = newBooked >= row.totalSlots

      await tx
        .update(packageInventory)
        .set({
          bookedSlots: newBooked,
          isSoldOut,
        })
        .where(eq(packageInventory.id, packageId))

      return {
        success: true,
        remaining: row.totalSlots - newBooked,
        message: isSoldOut ? "Réservation confirmée. Package complet." : "Réservation confirmée.",
      }
    })

    return result
  } catch (error) {
    console.error("[inventory] booking transaction error:", error)
    return {
      success: false,
      remaining: 0,
      message: "Échec de la réservation en raison d'une erreur concurrentielle ou technique.",
    }
  }
}

export async function releaseSlots(
  packageId: string,
  slots: number = 1
): Promise<BookingResult> {
  if (slots <= 0) {
    return {
      success: false,
      remaining: 0,
      message: "Le nombre de places à libérer doit être supérieur à zéro.",
    }
  }

  try {
    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .select({
          id: packageInventory.id,
          totalSlots: packageInventory.totalSlots,
          bookedSlots: packageInventory.bookedSlots,
        })
        .from(packageInventory)
        .where(eq(packageInventory.id, packageId))
        .for("update")
        .limit(1)

      if (rows.length === 0) {
        return {
          success: false,
          remaining: 0,
          message: "Package introuvable.",
        }
      }

      const row = rows[0]
      const newBooked = Math.max(0, row.bookedSlots - slots)
      // Dès que des places sont libérées, le package n'est plus complet.
      const isSoldOut = newBooked >= row.totalSlots

      await tx
        .update(packageInventory)
        .set({
          bookedSlots: newBooked,
          isSoldOut,
        })
        .where(eq(packageInventory.id, packageId))

      return {
        success: true,
        remaining: row.totalSlots - newBooked,
        message: "Places libérées avec succès.",
      }
    })

    return result
  } catch (error) {
    console.error("[inventory] release transaction error:", error)
    return {
      success: false,
      remaining: 0,
      message: "Échec de la libération des places.",
    }
  }
}

export async function initializeInventory(
  packageName: string,
  category: string,
  destination: string | null,
  totalSlots: number,
  thresholdUrgency: number = 3
): Promise<string> {
  const inserted = await db
    .insert(packageInventory)
    .values({
      packageName,
      category,
      destination,
      totalSlots,
      thresholdUrgency,
    })
    .returning({ id: packageInventory.id })

  return inserted[0].id
}
