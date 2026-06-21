import { db } from "@/db"
import { userWallets } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { normalizePhone } from "@/lib/phone"

/**
 * loyaltyService.ts
 *
 * Système de fidélité et portefeuille virtuel Easy2Book.
 * - Gère les crédits éco (eco_credits) et les statuts d'adhésion (free / pass).
 * - Crédite des points lors des réservations validées et des partages d'itinéraires.
 * - Déduit les crédits du calcul final du prix.
 */

export type MembershipStatus = "free" | "pass"

export const PASS_MEMBER_MARKUP_BYPASS_CATEGORIES = ["hotel", "alternative", "explorer"]

export const ECO_CREDIT_REWARDS = {
  bookingConfirmed: 500, // Crédits pour une réservation validée
  itineraryShared: 100,  // Crédits pour un partage d'itinéraire
  referral: 250,         // Crédits pour un parrainage
}

export const ECO_CREDIT_VALUE_TND = 0.01 // 1 crédit = 0.01 TND

export interface Wallet {
  id: string
  userPhone: string
  ecoCredits: number
  membershipStatus: MembershipStatus | string
}

/**
 * Récupère ou crée le portefeuille d'un utilisateur par numéro de téléphone.
 */
export async function getOrCreateWallet(userPhone: string): Promise<Wallet> {
  const phone = normalizePhone(userPhone)

  const existing = await db
    .select()
    .from(userWallets)
    .where(eq(userWallets.userPhone, phone))
    .limit(1)

  if (existing.length > 0) {
    return existing[0] as Wallet
  }

  const inserted = await db
    .insert(userWallets)
    .values({
      userPhone: phone,
      ecoCredits: 0,
      membershipStatus: "free",
    })
    .returning()

  return inserted[0] as Wallet
}

/**
 * Vérifie si un utilisateur est membre Pass.
 */
export async function isPassMember(userPhone: string): Promise<boolean> {
  const wallet = await getOrCreateWallet(userPhone)
  return wallet.membershipStatus === "pass"
}

/**
 * Crédite des éco-crédits au portefeuille d'un utilisateur.
 */
export async function creditEcoCredits(
  userPhone: string,
  amount: number,
  reason?: string
): Promise<Wallet> {
  const phone = normalizePhone(userPhone)

  const wallet = await getOrCreateWallet(phone)
  const newBalance = wallet.ecoCredits + amount

  const updated = await db
    .update(userWallets)
    .set({
      ecoCredits: newBalance,
      updatedAt: new Date(),
    })
    .where(eq(userWallets.id, wallet.id))
    .returning()

  console.log(`[loyalty] credited ${amount} eco credits to ${phone} (${reason || "no reason"}). Balance: ${newBalance}`)
  return updated[0] as Wallet
}

/**
 * Déduit des éco-crédits du portefeuille d'un utilisateur.
 * Retourne le montant effectivement déduit (ne descend pas sous 0).
 */
export async function deductEcoCredits(
  userPhone: string,
  amount: number
): Promise<number> {
  const phone = normalizePhone(userPhone)

  const wallet = await getOrCreateWallet(phone)
  const deduction = Math.min(wallet.ecoCredits, amount)
  if (deduction <= 0) return 0

  await db
    .update(userWallets)
    .set({
      ecoCredits: sql`${userWallets.ecoCredits} - ${deduction}`,
      updatedAt: new Date(),
    })
    .where(eq(userWallets.id, wallet.id))

  return deduction
}

/**
 * Calcule le prix final après application des crédits éco.
 */
export async function applyEcoCredits(
  userPhone: string,
  price: number
): Promise<{ finalPrice: number; creditsUsed: number }> {
  const wallet = await getOrCreateWallet(userPhone)
  const maxCreditsValue = wallet.ecoCredits * ECO_CREDIT_VALUE_TND
  const creditsUsedTnd = Math.min(maxCreditsValue, price)
  const creditsUsed = Math.floor(creditsUsedTnd / ECO_CREDIT_VALUE_TND)

  const finalPrice = Math.max(0, price - creditsUsedTnd)

  return { finalPrice, creditsUsed }
}

/**
 * Récompense une réservation validée.
 */
export async function rewardBookingConfirmed(
  userPhone: string,
  bookingId?: string
): Promise<Wallet> {
  return creditEcoCredits(
    userPhone,
    ECO_CREDIT_REWARDS.bookingConfirmed,
    bookingId ? `booking confirmed: ${bookingId}` : "booking confirmed"
  )
}

/**
 * Récompense un partage d'itinéraire.
 */
export async function rewardItineraryShared(
  userPhone: string,
  tripId?: string
): Promise<Wallet> {
  return creditEcoCredits(
    userPhone,
    ECO_CREDIT_REWARDS.itineraryShared,
    tripId ? `itinerary shared: ${tripId}` : "itinerary shared"
  )
}

/**
 * Met à jour le statut d'adhésion d'un utilisateur.
 */
export async function setMembershipStatus(
  userPhone: string,
  status: MembershipStatus
): Promise<Wallet> {
  const phone = normalizePhone(userPhone)
  const wallet = await getOrCreateWallet(phone)

  const updated = await db
    .update(userWallets)
    .set({
      membershipStatus: status,
      updatedAt: new Date(),
    })
    .where(eq(userWallets.id, wallet.id))
    .returning()

  return updated[0] as Wallet
}
