import { NextResponse } from "next/server"
import { db } from "@/db"
import { aiMarketTrends } from "@/db/schema"
import { sql, count, desc, gte } from "drizzle-orm"

/**
 * GET /api/admin/trends-analytics
 *
 * API d'agrégation des tendances de marché pour le tableau de bord Easy2Book.
 * - Top 5 des destinations les 7 derniers jours.
 * - Part du tourisme alternatif vs classique.
 * - Mots-clés émergents de la semaine.
 */

const DAYS_WINDOW = 7

export async function GET() {
  try {
    const sinceDate = new Date(Date.now() - DAYS_WINDOW * 24 * 60 * 60 * 1000)

    // Top 5 destinations demandées
    const topDestinations = await db
      .select({
        destination: aiMarketTrends.detectedDestination,
        count: count(aiMarketTrends.id),
      })
      .from(aiMarketTrends)
      .where(gte(aiMarketTrends.createdAt, sinceDate))
      .groupBy(aiMarketTrends.detectedDestination)
      .orderBy(desc(count(aiMarketTrends.id)))
      .limit(5)

    // Part alternative vs classique
    const categoryBreakdown = await db
      .select({
        category: aiMarketTrends.detectedCategory,
        count: count(aiMarketTrends.id),
      })
      .from(aiMarketTrends)
      .where(gte(aiMarketTrends.createdAt, sinceDate))
      .groupBy(aiMarketTrends.detectedCategory)

    const totalCategorized = categoryBreakdown.reduce((sum, row) => sum + row.count, 0)
    const alternativeCategories = ["explorer", "alternative"]
    const alternativeCount = categoryBreakdown
      .filter((row) => row.category && alternativeCategories.includes(row.category))
      .reduce((sum, row) => sum + row.count, 0)
    const alternativeShare = totalCategorized > 0 ? Math.round((alternativeCount / totalCategorized) * 1000) / 10 : 0

    // Mots-clés émergents : agrégation par fréquence
    const keywordRows = await db
      .select({
        keywords: aiMarketTrends.rawKeywords,
      })
      .from(aiMarketTrends)
      .where(gte(aiMarketTrends.createdAt, sinceDate))

    const keywordCounts = new Map<string, number>()
    for (const row of keywordRows) {
      if (!row.keywords) continue
      for (const keyword of row.keywords) {
        const normalized = keyword.toLowerCase().trim()
        if (!normalized) continue
        keywordCounts.set(normalized, (keywordCounts.get(normalized) || 0) + 1)
      }
    }

    const emergingKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([keyword, count]) => ({ keyword, count }))

    // Total de demandes analysées
    const totalAnalyzed = await db
      .select({ count: count(aiMarketTrends.id) })
      .from(aiMarketTrends)
      .where(gte(aiMarketTrends.createdAt, sinceDate))
      .then((rows) => rows[0]?.count || 0)

    return NextResponse.json({
      periodDays: DAYS_WINDOW,
      totalAnalyzed,
      topDestinations: topDestinations.map((row) => ({
        destination: row.destination || "Non précisé",
        count: row.count,
      })),
      alternativeShare,
      categoryBreakdown,
      emergingKeywords,
    })
  } catch (error) {
    console.error("[trends-analytics] error:", error)
    return NextResponse.json(
      { error: "Échec de l'agrégation des tendances.", details: (error as Error).message },
      { status: 500 }
    )
  }
}
