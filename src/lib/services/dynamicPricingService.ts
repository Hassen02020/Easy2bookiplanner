import { db } from "@/db"
import { aiMarketTrends, pricingRules } from "@/db/schema"
import { count, gte, lt, eq, and } from "drizzle-orm"
import { invalidatePricingRulesCache } from "@/lib/services/pricingService"

/**
 * dynamicPricingService.ts
 *
 * Tarification dynamique prédictive pour Easy2Book.
 * Analyse la table ai_market_trends sur une fenêtre glissante de 6 heures
 * et insère/active des règles de markup temporaires lorsqu'une destination
 * connaît une surdemande (seuil configurable, par défaut +30%).
 */

export const DYNAMIC_PRICING_WINDOW_MS = 6 * 60 * 60 * 1000 // 6 heures
export const DYNAMIC_SURGE_THRESHOLD = 0.3 // +30%
export const DYNAMIC_SURGE_MARKUP = 5 // +5%

interface DestinationVolume {
  destination: string
  current: number
  previous: number
}

/**
 * Récupère le volume de recherches par destination sur les 6 dernières heures
 * et les 6 heures précédentes pour calculer la variation.
 */
export async function analyzeDestinationVolumes(): Promise<DestinationVolume[]> {
  const now = new Date()
  const currentWindowStart = new Date(now.getTime() - DYNAMIC_PRICING_WINDOW_MS)
  const previousWindowStart = new Date(now.getTime() - 2 * DYNAMIC_PRICING_WINDOW_MS)

  const currentRows = await db
    .select({
      destination: aiMarketTrends.detectedDestination,
      count: count(aiMarketTrends.id),
    })
    .from(aiMarketTrends)
    .where(gte(aiMarketTrends.createdAt, currentWindowStart))
    .groupBy(aiMarketTrends.detectedDestination)

  const previousRows = await db
    .select({
      destination: aiMarketTrends.detectedDestination,
      count: count(aiMarketTrends.id),
    })
    .from(aiMarketTrends)
    .where(and(
      gte(aiMarketTrends.createdAt, previousWindowStart),
      lt(aiMarketTrends.createdAt, currentWindowStart)
    ))
    .groupBy(aiMarketTrends.detectedDestination)

  const previousMap = new Map(previousRows.map((row) => [row.destination || "__unknown", row.count]))

  return currentRows
    .filter((row) => row.destination) // on ignore les destinations non détectées
    .map((row) => {
      const destination = row.destination!
      const current = row.count
      const previous = previousMap.get(destination) || 0
      return { destination, current, previous }
    })
}

/**
 * Détecte les destinations en surdemande selon le seuil configuré.
 */
export function detectSurgingDestinations(volumes: DestinationVolume[]): DestinationVolume[] {
  return volumes.filter((volume) => {
    if (volume.previous === 0) {
      // Si aucune donnée historique, on considère la surdemande à partir de 5 requêtes
      return volume.current >= 5
    }
    const growth = (volume.current - volume.previous) / volume.previous
    return growth >= DYNAMIC_SURGE_THRESHOLD
  })
}

/**
 * Active ou insère une règle de markup temporaire pour une destination.
 */
export async function applySurgeMarkup(destination: string): Promise<void> {
  const existing = await db
    .select({ id: pricingRules.id, isActive: pricingRules.isActive })
    .from(pricingRules)
    .where(
      and(
        eq(pricingRules.category, "dynamic"),
        eq(pricingRules.destination, destination),
        eq(pricingRules.ruleType, "markup_percentage")
      )
    )
    .limit(1)

  if (existing.length > 0) {
    if (!existing[0].isActive) {
      await db
        .update(pricingRules)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(pricingRules.id, existing[0].id))
    }
    return
  }

  await db.insert(pricingRules).values({
    category: "dynamic",
    destination,
    ruleType: "markup_percentage",
    value: String(DYNAMIC_SURGE_MARKUP),
    isActive: true,
  })
}

/**
 * Désactive les règles dynamiques obsolètes (créées il y a plus de 24h).
 */
export async function deactivateStaleDynamicRules(): Promise<void> {
  const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000)

  await db
    .update(pricingRules)
    .set({ isActive: false })
    .where(
      and(
        eq(pricingRules.category, "dynamic"),
        eq(pricingRules.isActive, true),
        lt(pricingRules.updatedAt, staleThreshold)
      )
    )
}

/**
 * Orchestration complète : analyse, détection et application.
 * Retourne la liste des destinations sur lesquelles un markup a été appliqué.
 */
export async function runDynamicPricing(): Promise<string[]> {
  await deactivateStaleDynamicRules()

  const volumes = await analyzeDestinationVolumes()
  const surging = detectSurgingDestinations(volumes)

  const applied: string[] = []
  for (const volume of surging) {
    await applySurgeMarkup(volume.destination)
    applied.push(volume.destination)
  }

  if (applied.length > 0) {
    invalidatePricingRulesCache()
  }

  return applied
}
