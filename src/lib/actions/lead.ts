"use server"

import { cookies } from "next/headers"
import { z } from "zod"
import { db } from "@/db"
import { users, leadRequests } from "@/db/schema"
import { eq } from "drizzle-orm"
import { normalizePhone, isValidTunisianPhone } from "@/lib/phone"
import { buildWhatsAppManifest, buildWhatsAppLink } from "@/utils/whatsappManifest"
import { getTelemetryData } from "@/lib/telemetry"

const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().refine(isValidTunisianPhone, {
    message: "Invalid Tunisian phone number",
  }),
  serviceType: z.enum(["hotel", "flight", "trip"]),
  destination: z.string().min(1),
  period: z.string().optional().default("Non précisée"),
  participants: z.string().optional().default("Non précisé"),
  calculatedPrice: z.string().optional().default("0.00"),
  remainingSlots: z.number().optional().nullable(),
  aiSummary: z.string().optional().default("Lead intéressé par une offre Easy2Book"),
})

export type LeadInput = z.infer<typeof leadSchema>

export async function submitLead(input: LeadInput) {
  const validated = leadSchema.parse(input)
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("e2b_session")?.value

  if (!sessionToken) {
    throw new Error("Session not found")
  }

  const telemetry = await getTelemetryData()
  const phone = normalizePhone(validated.phone)

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, validated.email))
    .limit(1)

  let userId: string

  if (existingUser.length > 0) {
    userId = existingUser[0].id
  } else {
    const inserted = await db
      .insert(users)
      .values({
        firstName: validated.firstName,
        lastName: validated.lastName,
        phone,
        email: validated.email,
        metaFbp: telemetry.fbp,
        metaFbc: telemetry.fbc,
      })
      .returning({ id: users.id })

    userId = inserted[0].id
  }

  const leadRows = await db
    .select({ id: leadRequests.id })
    .from(leadRequests)
    .where(eq(leadRequests.sessionToken, sessionToken))
    .limit(1)

  const leadId = leadRows[0]?.id

  if (leadId) {
    await db
      .update(leadRequests)
      .set({
        userId,
        serviceType: validated.serviceType,
        aiSummary: validated.aiSummary,
        status: "redirected_whatsapp",
        clientIp: telemetry.ip,
        clientUserAgent: telemetry.userAgent,
        detectedCity: telemetry.city,
        detectedRegion: telemetry.region,
      })
      .where(eq(leadRequests.id, leadId))
  }

  const manifest = buildWhatsAppManifest({
    leadId: leadId || sessionToken,
    firstName: validated.firstName,
    lastName: validated.lastName,
    phone,
    email: validated.email,
    serviceType: mapServiceType(validated.serviceType),
    destination: validated.destination,
    period: validated.period,
    participants: validated.participants,
    calculatedPrice: validated.calculatedPrice,
    remainingSlots: validated.remainingSlots,
    detectedCity: telemetry.city,
    detectedRegion: telemetry.region,
    aiSummary: validated.aiSummary,
  })

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || "21600000000"
  const whatsappLink = buildWhatsAppLink(whatsappNumber, manifest)

  return {
    leadId,
    userId,
    whatsappLink,
  }
}

function mapServiceType(type: "hotel" | "flight" | "trip"): string {
  const map: Record<typeof type, string> = {
    hotel: "Hôtel",
    flight: "Vol",
    trip: "Voyage Organisé",
  }
  return map[type]
}
