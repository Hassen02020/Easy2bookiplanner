import { db } from "@/db"
import { pricingRules } from "@/db/schema"
import { eq, and, isNull, or, desc } from "drizzle-orm"

export type PricingRuleType = "markup_percentage" | "discount_fixed" | "override"
export type ServiceType = "hotel" | "flight" | "trip"

export interface PricingRule {
  category: string
  destination?: string | null
  ruleType: PricingRuleType
  value: number
  isActive: boolean
}

export function applyPricingRules(basePrice: number, rules: PricingRule[]): number {
  const activeRules = rules.filter((rule) => rule.isActive)

  const overrideRule = activeRules.find((rule) => rule.ruleType === "override")
  if (overrideRule) {
    return Math.max(0, Number(overrideRule.value))
  }

  let finalPrice = basePrice

  for (const rule of activeRules) {
    if (rule.ruleType === "markup_percentage") {
      finalPrice = finalPrice * (1 + Number(rule.value) / 100)
    } else if (rule.ruleType === "discount_fixed") {
      finalPrice = finalPrice - Number(rule.value)
    }
  }

  return Math.max(0, finalPrice)
}

export async function calculateDisplayPrice(
  serviceType: ServiceType,
  rawPrice: number,
  destination?: string | null,
  category?: string | null
): Promise<number> {
  const categoryConditions = category
    ? [eq(pricingRules.category, category), eq(pricingRules.category, "generic")]
    : [eq(pricingRules.category, "generic")]

  const destinationConditions = destination
    ? [eq(pricingRules.destination, destination), isNull(pricingRules.destination)]
    : [isNull(pricingRules.destination)]

  const rows = await db
    .select()
    .from(pricingRules)
    .where(
      and(
        eq(pricingRules.isActive, true),
        or(...categoryConditions),
        or(...destinationConditions)
      )
    )
    .orderBy(desc(pricingRules.destination))

  const rules: PricingRule[] = rows.map((row) => ({
    category: row.category,
    destination: row.destination,
    ruleType: row.ruleType,
    value: Number(row.value),
    isActive: row.isActive,
  }))

  return applyPricingRules(rawPrice, rules)
}

export function formatPrice(price: number, currency: string = "TND"): string {
  return `${price.toFixed(2)} ${currency}`
}

export function formatIndicativePrice(price: number, currency: string = "TND"): string {
  return `À partir de ${formatPrice(price, currency)}`
}
