"use server"

/**
 * sessionLimiter.ts
 *
 * Limiteur de jetons conversationnels pour Easy2Book.
 * Chaque utilisateur anonyme dispose de 3 messages gratuits.
 * Au-delà, un paywall est déclenché via le drapeau frontend `triggerPaywall`.
 */

import { cookies } from "next/headers"

const MAX_FREE_MESSAGES = 3

export interface SessionUsage {
  sessionId: string
  messageCount: number
  maxFreeMessages: number
  remaining: number
  isAllowed: boolean
  triggerPaywall: boolean
}

const SESSION_COOKIE = "e2b_session_usage"

/**
 * Vérifie si une session a encore des messages gratuits disponibles.
 * Crée un cookie de session si nécessaire.
 */
export async function isSessionValid(sessionId: string): Promise<boolean> {
  const usage = await getSessionUsage()
  return usage.isAllowed
}

/**
 * Récupère ou initialise le compteur de messages d'une session.
 */
export async function getSessionUsage(): Promise<SessionUsage> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(SESSION_COOKIE)
  const sessionId = cookieStore.get("e2b_session")?.value || "anonymous"

  let count = 0
  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value)
      count = Math.max(0, Number(parsed.messageCount) || 0)
    } catch {
      count = 0
    }
  }

  const remaining = Math.max(0, MAX_FREE_MESSAGES - count)
  const isAllowed = count < MAX_FREE_MESSAGES
  const triggerPaywall = !isAllowed

  return {
    sessionId,
    messageCount: count,
    maxFreeMessages: MAX_FREE_MESSAGES,
    remaining,
    isAllowed,
    triggerPaywall,
  }
}

/**
 * Incrémente le compteur de messages d'une session.
 */
export async function incrementSessionUsage(): Promise<SessionUsage> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(SESSION_COOKIE)
  const sessionId = cookieStore.get("e2b_session")?.value || "anonymous"

  let count = 0
  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value)
      count = Math.max(0, Number(parsed.messageCount) || 0)
    } catch {
      count = 0
    }
  }

  count += 1

  cookieStore.set(SESSION_COOKIE, JSON.stringify({ messageCount: count }), {
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })

  const remaining = Math.max(0, MAX_FREE_MESSAGES - count)
  const isAllowed = count < MAX_FREE_MESSAGES
  const triggerPaywall = !isAllowed

  return {
    sessionId,
    messageCount: count,
    maxFreeMessages: MAX_FREE_MESSAGES,
    remaining,
    isAllowed,
    triggerPaywall,
  }
}

/**
 * Réinitialise le compteur de messages (après conversion ou paiement).
 */
export async function resetSessionUsage(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, JSON.stringify({ messageCount: 0 }), {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  })
}
