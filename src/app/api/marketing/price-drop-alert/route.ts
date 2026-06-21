import { NextResponse } from "next/server"
import { db } from "@/db"
import { aiMarketTrends, pricingRules, users, leadRequests } from "@/db/schema"
import { sql, eq, and, gte, inArray, isNull, not } from "drizzle-orm"
import { normalizePhone } from "@/lib/phone"

/**
 * GET /api/marketing/price-drop-alert
 *
 * API de relance intelligente "Price Drop".
 * Croise les baisses de prix actives (règles de remise) avec les recherches
 * infructueuses des clients stockées dans ai_market_trends, génère les
 * numéros de téléphone normalisés et les messages WhatsApp prêts à l'envoi.
 */

const DAYS_WINDOW = 14

interface PriceDropAlert {
  destination: string
  discountValue: number
  interestedClients: Array<{
    phone: string
    sessionId: string
    detectedCategory: string | null
    message: string
  }>
}

/**
 * Détecte les destinations avec une règle de remise active.
 */
async function findActiveDiscounts() {
  const sinceDate = new Date(Date.now() - DAYS_WINDOW * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      destination: pricingRules.destination,
      value: pricingRules.value,
    })
    .from(pricingRules)
    .where(
      and(
        eq(pricingRules.ruleType, "discount_fixed"),
        eq(pricingRules.isActive, true),
        gte(pricingRules.updatedAt, sinceDate),
        not(isNull(pricingRules.destination))
      )
    )

  return rows.map((row) => ({
    destination: row.destination!,
    discountValue: Number(row.value),
  }))
}

/**
 * Récupère les clients intéressés par une destination mais n'ayant pas encore converti.
 * Une recherche est considérée comme infructueuse si aucun lead_request n'existe
 * pour la session avec le statut "redirected_whatsapp".
 */
async function findInterestedClients(destination: string) {
  const sinceDate = new Date(Date.now() - DAYS_WINDOW * 24 * 60 * 60 * 1000)

  // Dernière tendance par session pour la destination
  const trendRows = await db
    .select({
      sessionId: aiMarketTrends.sessionId,
      detectedCategory: aiMarketTrends.detectedCategory,
    })
    .from(aiMarketTrends)
    .where(
      and(
        gte(aiMarketTrends.createdAt, sinceDate),
        sql`${aiMarketTrends.detectedDestination} ILIKE ${`%${destination}%`}`
      )
    )

  const seen = new Map<string, string | null>()
  for (const row of trendRows) {
    if (!seen.has(row.sessionId)) {
      seen.set(row.sessionId, row.detectedCategory)
    }
  }

  const sessionIds = Array.from(seen.keys())
  if (sessionIds.length === 0) return []

  // Jointure avec leadRequests et users pour récupérer les téléphones
  const clientRows = await db
    .select({
      sessionId: leadRequests.sessionToken,
      phone: users.phone,
    })
    .from(leadRequests)
    .innerJoin(users, eq(leadRequests.userId, users.id))
    .where(inArray(leadRequests.sessionToken, sessionIds))

  const clients = clientRows
    .filter((row) => row.phone)
    .map((row) => ({
      sessionId: row.sessionId,
      phone: normalizePhone(row.phone!),
      detectedCategory: seen.get(row.sessionId) || null,
    }))

  return clients
}

function buildWhatsAppMessage(
  destination: string,
  discountValue: number,
  category: string | null
): string {
  const context = category === "omra" ? "votre pèlerinage" : `votre voyage à ${destination}`
  return encodeURIComponent(
    `🎉 Bonne nouvelle ! Le prix pour ${context} vient de baisser de ${discountValue} TND. Cette offre est limitée : souhaitez-vous que je vous réserve votre place maintenant ?`
  )
}

export async function GET() {
  try {
    const discounts = await findActiveDiscounts()
    if (discounts.length === 0) {
      return NextResponse.json({
        alerts: [],
        message: "Aucune baisse de prix active détectée.",
      })
    }

    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "21600000000"
    const alerts: PriceDropAlert[] = []

    for (const discount of discounts) {
      const clients = await findInterestedClients(discount.destination)
      if (clients.length === 0) continue

      alerts.push({
        destination: discount.destination,
        discountValue: discount.discountValue,
        interestedClients: clients.map((client) => ({
          phone: client.phone,
          sessionId: client.sessionId,
          detectedCategory: client.detectedCategory,
          message: `https://wa.me/${whatsappNumber}?text=${buildWhatsAppMessage(
            discount.destination,
            discount.discountValue,
            client.detectedCategory
          )}`,
        })),
      })
    }

    return NextResponse.json({
      alerts,
      totalClients: alerts.reduce((sum, alert) => sum + alert.interestedClients.length, 0),
    })
  } catch (error) {
    console.error("[price-drop-alert] error:", error)
    return NextResponse.json(
      {
        error: "Échec de génération des alertes Price Drop.",
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
