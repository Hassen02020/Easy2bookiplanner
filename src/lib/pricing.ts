import { db } from "@/db"
import { pricingRules } from "@/db/schema"
import { eq, and, isNull, or, desc } from "drizzle-orm"

export type ServiceType = "hotel" | "flight" | "trip"

export async function calculateDisplayPrice(
  serviceType: ServiceType,
  rawPrice: number,
  destination?: string | null
): Promise<number> {
  const destinationConditions = destination
    ? [eq(pricingRules.destination, destination), isNull(pricingRules.destination)]
    : [isNull(pricingRules.destination)]

  const rules = await db
    .select()
    .from(pricingRules)
    .where(
      and(
        eq(pricingRules.serviceType, serviceType),
        eq(pricingRules.isActive, true),
        or(...destinationConditions)
      )
    )
    .orderBy(desc(pricingRules.destination))

  const specificRule = destination
    ? rules.find((rule) => rule.destination === destination)
    : undefined
  const genericRule = rules.find((rule) => rule.destination === null)
  const rule = specificRule || genericRule

  if (rule?.overridePrice) {
    return Number(rule.overridePrice)
  }

  const markup = rule ? Number(rule.markupPercent) : 1.10
  const discount = rule ? Number(rule.fixedDiscount) : 0

  return Math.max(0, rawPrice * markup - discount)
}

export function formatPrice(price: number, currency: string = "TND"): string {
  return `${price.toFixed(2)} ${currency}`
}

export function formatIndicativePrice(price: number, currency: string = "TND"): string {
  return `À partir de ${formatPrice(price, currency)}`
}
