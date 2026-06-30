/**
 * sessionLimiter.ts
 *
 * Pas de limite de messages pour le chat.
 * Détecte les clients qui reviennent plusieurs fois sans confirmer de réservation.
 * Après 5 visites sans confirmation, le client est rejeté avec un message d'orientation.
 */

import { cookies } from "next/headers"

const MAX_VISITS_WITHOUT_CONFIRM = 5
const SESSION_COOKIE = "e2b_session_usage"

export interface SessionUsage {
  sessionId: string
  messageCount: number
  maxFreeMessages: number
  remaining: number
  isAllowed: boolean
  triggerPaywall: boolean
  visitCount: number
  hasConfirmed: boolean
  isRejected: boolean
}

function parseCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`))
  return match ? match[1] : undefined
}

function buildUsage(cookieHeader: string | null, sessionId: string): SessionUsage {
  const raw = parseCookie(cookieHeader, SESSION_COOKIE)
  let messageCount = 0
  let visitCount = 0
  let hasConfirmed = false

  if (raw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw))
      messageCount = Math.max(0, Number(parsed.messageCount) || 0)
      visitCount = Math.max(0, Number(parsed.visitCount) || 0)
      hasConfirmed = Boolean(parsed.hasConfirmed)
    } catch {
      // reset
    }
  }

  const isRejected = !hasConfirmed && visitCount >= MAX_VISITS_WITHOUT_CONFIRM
  const isAllowed = !isRejected

  return {
    sessionId,
    messageCount,
    maxFreeMessages: 0,
    remaining: 0,
    isAllowed,
    triggerPaywall: false,
    visitCount,
    hasConfirmed,
    isRejected,
  }
}

/**
 * Vérifie si une session est autorisée à chatter.
 * Utilise next/headers cookies (pour les server components/actions).
 */
export async function isSessionValid(sessionId: string): Promise<boolean> {
  const usage = await getSessionUsage()
  return usage.isAllowed
}

/**
 * Récupère les infos de session via next/headers.
 */
export async function getSessionUsage(): Promise<SessionUsage> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("e2b_session")?.value || "anonymous"
  const cookieHeader = cookieStore.toString()
  return buildUsage(cookieHeader, sessionId)
}

/**
 * Version légère pour API routes : lit directement depuis le header de requête.
 */
export function getSessionUsageFromRequest(request: Request): SessionUsage {
  const cookieHeader = request.headers.get("cookie") || ""
  const sessionId = parseCookie(cookieHeader, "e2b_session") || "anonymous"
  return buildUsage(cookieHeader, sessionId)
}

/**
 * Incrémente le compteur de messages. Pas de limite.
 */
export async function incrementSessionUsage(): Promise<SessionUsage> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(SESSION_COOKIE)
  const sessionId = cookieStore.get("e2b_session")?.value || "anonymous"

  let messageCount = 0
  let visitCount = 0
  let hasConfirmed = false

  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value)
      messageCount = Math.max(0, Number(parsed.messageCount) || 0)
      visitCount = Math.max(0, Number(parsed.visitCount) || 0)
      hasConfirmed = Boolean(parsed.hasConfirmed)
    } catch {
      // reset
    }
  }

  messageCount += 1

  cookieStore.set(SESSION_COOKIE, JSON.stringify({ messageCount, visitCount, hasConfirmed }), {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })

  const isRejected = !hasConfirmed && visitCount >= MAX_VISITS_WITHOUT_CONFIRM
  const isAllowed = !isRejected

  return {
    sessionId,
    messageCount,
    maxFreeMessages: 0,
    remaining: 0,
    isAllowed,
    triggerPaywall: false,
    visitCount,
    hasConfirmed,
    isRejected,
  }
}

/**
 * Incrémente le compteur de visites.
 */
export async function incrementVisitCount(): Promise<SessionUsage> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(SESSION_COOKIE)
  const sessionId = cookieStore.get("e2b_session")?.value || "anonymous"

  let messageCount = 0
  let visitCount = 0
  let hasConfirmed = false

  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value)
      messageCount = Math.max(0, Number(parsed.messageCount) || 0)
      visitCount = Math.max(0, Number(parsed.visitCount) || 0)
      hasConfirmed = Boolean(parsed.hasConfirmed)
    } catch {
      // reset
    }
  }

  visitCount += 1

  cookieStore.set(SESSION_COOKIE, JSON.stringify({ messageCount, visitCount, hasConfirmed }), {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })

  const isRejected = !hasConfirmed && visitCount >= MAX_VISITS_WITHOUT_CONFIRM
  const isAllowed = !isRejected

  return {
    sessionId,
    messageCount,
    maxFreeMessages: 0,
    remaining: 0,
    isAllowed,
    triggerPaywall: false,
    visitCount,
    hasConfirmed,
    isRejected,
  }
}

/**
 * Marque la session comme ayant confirmé une réservation.
 */
export async function confirmReservation(): Promise<void> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(SESSION_COOKIE)

  let messageCount = 0
  let visitCount = 0

  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value)
      messageCount = Math.max(0, Number(parsed.messageCount) || 0)
      visitCount = Math.max(0, Number(parsed.visitCount) || 0)
    } catch {
      // reset
    }
  }

  cookieStore.set(SESSION_COOKIE, JSON.stringify({ messageCount, visitCount, hasConfirmed: true }), {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })
}

/**
 * Réinitialise le compteur.
 */
export async function resetSessionUsage(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, JSON.stringify({ messageCount: 0, visitCount: 0, hasConfirmed: false }), {
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })
}
