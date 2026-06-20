import { unstable_cache, revalidateTag } from "next/cache"
import { db } from "@/db"
import { pricingRules } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * pricingService.ts
 *
 * Couche d'accès aux données optimisée pour les règles de tarification.
 * - Mise en cache via `unstable_cache` de Next.js 15 (durée : 1 heure).
 * - Revalidation par tag (`pricing_rules`) pour invalidation instantanée.
 * - Résilience : fallback sur un cache stale ou liste vide en cas de panne Neon.
 */

export const PRICING_RULES_CACHE_TAG = "pricing_rules"
const CACHE_TTL_SECONDS = 60 * 60 // 1 heure

export type PricingRuleRow = {
  id: string
  category: string
  destination: string | null
  ruleType: "markup_percentage" | "discount_fixed" | "override"
  value: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Cache de secours en mémoire pour la stratégie stale-while-revalidate.
let fallbackCache: PricingRuleRow[] | null = null

/**
 * Récupère toutes les règles de tarification actives depuis la base de données.
 * Le résultat est mis en cache pendant 1 heure avec le tag `pricing_rules`.
 */
export const getActivePricingRules = unstable_cache(
  async (): Promise<PricingRuleRow[]> => {
    try {
      const rows = await db
        .select({
          id: pricingRules.id,
          category: pricingRules.category,
          destination: pricingRules.destination,
          ruleType: pricingRules.ruleType,
          value: pricingRules.value,
          isActive: pricingRules.isActive,
          createdAt: pricingRules.createdAt,
          updatedAt: pricingRules.updatedAt,
        })
        .from(pricingRules)
        .where(eq(pricingRules.isActive, true))

      const normalized: PricingRuleRow[] = rows.map((row) => ({
        id: row.id,
        category: row.category,
        destination: row.destination,
        ruleType: row.ruleType,
        value: Number(row.value),
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }))

      fallbackCache = normalized
      return normalized
    } catch (error) {
      console.error("[pricingService] Failed to fetch active pricing rules:", error)

      // Stale-while-revalidate : retourne le cache de secours si disponible.
      if (fallbackCache) {
        console.warn("[pricingService] Serving stale fallback cache.")
        return fallbackCache
      }

      return []
    }
  },
  ["active-pricing-rules"],
  {
    tags: [PRICING_RULES_CACHE_TAG],
    revalidate: CACHE_TTL_SECONDS,
  }
)

/**
 * Récupère toutes les règles (actives et inactives) pour le dashboard admin.
 * Mise en cache courte (5 minutes) pour garder la vue admin fraîche.
 */
export const getAllPricingRules = unstable_cache(
  async (): Promise<PricingRuleRow[]> => {
    try {
      const rows = await db
        .select({
          id: pricingRules.id,
          category: pricingRules.category,
          destination: pricingRules.destination,
          ruleType: pricingRules.ruleType,
          value: pricingRules.value,
          isActive: pricingRules.isActive,
          createdAt: pricingRules.createdAt,
          updatedAt: pricingRules.updatedAt,
        })
        .from(pricingRules)

      return rows.map((row) => ({
        id: row.id,
        category: row.category,
        destination: row.destination,
        ruleType: row.ruleType,
        value: Number(row.value),
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }))
    } catch (error) {
      console.error("[pricingService] Failed to fetch all pricing rules:", error)
      return []
    }
  },
  ["all-pricing-rules"],
  {
    tags: [PRICING_RULES_CACHE_TAG],
    revalidate: 60 * 5, // 5 minutes
  }
)

/**
 * Invalide le cache des règles de tarification.
 * À appeler après chaque création, modification ou suppression depuis le dashboard admin.
 */
export function invalidatePricingRulesCache(): void {
  revalidateTag(PRICING_RULES_CACHE_TAG)
}

/**
 * Récupère une règle par son ID.
 * Non mise en cache par défaut pour garantir la fraîcheur en édition.
 */
export async function getPricingRuleById(id: string): Promise<PricingRuleRow | null> {
  try {
    const rows = await db
      .select({
        id: pricingRules.id,
        category: pricingRules.category,
        destination: pricingRules.destination,
        ruleType: pricingRules.ruleType,
        value: pricingRules.value,
        isActive: pricingRules.isActive,
        createdAt: pricingRules.createdAt,
        updatedAt: pricingRules.updatedAt,
      })
      .from(pricingRules)
      .where(eq(pricingRules.id, id))
      .limit(1)

    if (rows.length === 0) return null

    const row = rows[0]
    return {
      id: row.id,
      category: row.category,
      destination: row.destination,
      ruleType: row.ruleType,
      value: Number(row.value),
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  } catch (error) {
    console.error("[pricingService] Failed to fetch pricing rule by id:", error)
    return null
  }
}
