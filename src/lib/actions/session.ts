"use server"

import { cookies } from "next/headers"
import { db } from "@/db"
import { leadRequests } from "@/db/schema"
import { generateSessionToken, getTelemetryData } from "@/lib/telemetry"
import { eq } from "drizzle-orm"

const SESSION_COOKIE_NAME = "e2b_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function initializeSession() {
  const cookieStore = await cookies()
  let sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionToken) {
    sessionToken = generateSessionToken()
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    })
  }

  const telemetry = await getTelemetryData()

  const existing = await db
    .select({ id: leadRequests.id })
    .from(leadRequests)
    .where(eq(leadRequests.sessionToken, sessionToken))
    .limit(1)

  if (existing.length === 0) {
    await db.insert(leadRequests).values({
      sessionToken,
      serviceType: "trip",
      aiSummary: "Initial visit captured via telemetry middleware",
      status: "pending",
      clientIp: telemetry.ip,
      clientUserAgent: telemetry.userAgent,
      detectedCity: telemetry.city,
      detectedRegion: telemetry.region,
    })
  }

  return {
    sessionToken,
    telemetry,
  }
}
