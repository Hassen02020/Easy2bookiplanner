import { db } from "@/db"
import { aiMarketTrends } from "@/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"

/**
 * tribeMatcher.ts
 *
 * Système d'appariement de tribus "Smart Co-Traveling".
 * Identifie les sessions actives de tourisme alternatif qui partagent
 * la même destination et une plage de dates similaire (±2 jours),
 * puis génère une notification de groupe restreint offrant une réduction
 * de 20% sur la table d'hôte ou le guide local.
 */

export const TRIBE_DATE_TOLERANCE_DAYS = 2
export const TRIBE_DISCOUNT_PERCENT = 20

export interface TribeMatch {
  destination: string
  sessionIds: string[]
  requestedDates: string[]
  estimatedSavings: string
  notificationMessage: string
}

/**
 * Parse une plage de dates au format "JJ/MM/AAAA - JJ/MM/AAAA".
 * Retourne la date de début (start) et de fin (end) en millisecondes.
 */
function parseDateRange(range: string): { start: number; end: number } | null {
  const parts = range.split("-").map((p) => p.trim())
  if (parts.length !== 2) return null

  const [startStr, endStr] = parts
  const startDate = parseFrenchDate(startStr)
  const endDate = parseFrenchDate(endStr)

  if (!startDate || !endDate) return null
  return { start: startDate.getTime(), end: endDate.getTime() }
}

function parseFrenchDate(value: string): Date | null {
  const [day, month, year] = value.split("/").map((p) => parseInt(p.trim(), 10))
  if (!day || !month || !year) return null
  const date = new Date(year, month - 1, day)
  if (isNaN(date.getTime())) return null
  return date
}

/**
 * Détermine si deux plages de dates se chevauchent dans la tolérance de ±2 jours.
 */
function dateRangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  const toleranceMs = TRIBE_DATE_TOLERANCE_DAYS * 24 * 60 * 60 * 1000
  const aStart = a.start - toleranceMs
  const aEnd = a.end + toleranceMs
  return b.start <= aEnd && b.end >= aStart
}

/**
 * Récupère les sessions actives de tourisme alternatif sur les 7 derniers jours.
 */
async function getActiveAlternativeSessions(): Promise<
  Array<{
    sessionId: string
    destination: string | null
    requestedDates: string | null
  }>
> {
  const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      sessionId: aiMarketTrends.sessionId,
      destination: aiMarketTrends.detectedDestination,
      requestedDates: aiMarketTrends.requestedDates,
    })
    .from(aiMarketTrends)
    .where(
      and(
        gte(aiMarketTrends.createdAt, sinceDate),
        sql`${aiMarketTrends.detectedCategory} IN ('alternative', 'explorer')`
      )
    )

  // On ne garde que la dernière entrée par session
  const seen = new Set<string>()
  const unique: Array<{
    sessionId: string
    destination: string | null
    requestedDates: string | null
  }> = []

  for (const row of rows) {
    if (seen.has(row.sessionId)) continue
    seen.add(row.sessionId)
    unique.push(row)
  }

  return unique
}

/**
 * Groupe les sessions par destination et dates compatibles.
 */
export async function findTribeMatches(): Promise<TribeMatch[]> {
  const sessions = await getActiveAlternativeSessions()
  const eligible = sessions.filter((s) => s.destination && s.requestedDates)

  const groups: TribeMatch[] = []
  const processed = new Set<string>()

  for (let i = 0; i < eligible.length; i++) {
    const base = eligible[i]
    if (processed.has(base.sessionId)) continue

    const baseRange = parseDateRange(base.requestedDates!)
    if (!baseRange) continue

    const matchedSessionIds: string[] = [base.sessionId]
    const matchedDates: string[] = [base.requestedDates!]

    for (let j = i + 1; j < eligible.length; j++) {
      const candidate = eligible[j]
      if (candidate.destination !== base.destination) continue

      const candidateRange = parseDateRange(candidate.requestedDates!)
      if (!candidateRange) continue

      if (dateRangesOverlap(baseRange, candidateRange)) {
        matchedSessionIds.push(candidate.sessionId)
        matchedDates.push(candidate.requestedDates!)
        processed.add(candidate.sessionId)
      }
    }

    if (matchedSessionIds.length >= 2) {
      processed.add(base.sessionId)
      groups.push({
        destination: base.destination!,
        sessionIds: matchedSessionIds,
        requestedDates: matchedDates,
        estimatedSavings: `${TRIBE_DISCOUNT_PERCENT}%`,
        notificationMessage: buildTribeNotification(base.destination!, matchedSessionIds.length, TRIBE_DISCOUNT_PERCENT),
      })
    }
  }

  return groups
}

export function buildTribeNotification(destination: string, groupSize: number, discount: number): string {
  return `🔥 Bonne nouvelle ! ${groupSize} voyageurs comme vous partent à ${destination} aux mêmes dates. Rejoignez leur tribu et bénéficiez de -${discount}% sur la table d'hôte ou le guide local. Souhaitez-vous que je vous mette en relation ?`
}

/**
 * Insère une notification de tribu pour une session cible.
 * Cette fonction est appelée par l'orchestrateur ou un job périodique.
 */
export async function notifyTribeMatches(): Promise<TribeMatch[]> {
  const matches = await findTribeMatches()
  // Ici, on pourrait insérer les notifications dans une table `notifications`.
  // Pour l'instant, on retourne les matches pour un traitement en amont.
  return matches
}
