import { getActivePricingRules } from "@/lib/services/pricingService"

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
  const activeRules = await getActivePricingRules()

  const categoryMatches = category
    ? activeRules.filter(
        (rule) => rule.category === category || rule.category === "generic"
      )
    : activeRules.filter((rule) => rule.category === "generic")

  const destinationMatches = destination
    ? categoryMatches.filter(
        (rule) => rule.destination === destination || rule.destination === null
      )
    : categoryMatches.filter((rule) => rule.destination === null)

  const rules: PricingRule[] = destinationMatches.map((rule) => ({
    category: rule.category,
    destination: rule.destination,
    ruleType: rule.ruleType,
    value: Number(rule.value),
    isActive: rule.isActive,
  }))

  return applyPricingRules(rawPrice, rules)
}

export function formatPrice(price: number, currency: string = "TND"): string {
  return `${price.toFixed(2)} ${currency}`
}

export function formatIndicativePrice(price: number, currency: string = "TND"): string {
  return `À partir de ${formatPrice(price, currency)}`
}
