import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { z } from "zod"
import { getTelemetryData } from "@/lib/telemetry"

const trackEventSchema = z.object({
  eventName: z.enum(["PageView", "Lead", "InitiateCheckout", "Purchase"]),
  eventId: z.string().min(1),
  eventTime: z.number().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  value: z.number().optional(),
  currency: z.string().optional().default("TND"),
  contentName: z.string().optional(),
  contentCategory: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
})

function sha256(value: string | undefined): string | undefined {
  if (!value) return undefined
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex")
}

export async function POST(request: NextRequest) {
  try {
    const body = trackEventSchema.parse(await request.json())
    const telemetry = await getTelemetryData()
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
    const accessToken = process.env.META_ACCESS_TOKEN

    if (!pixelId || !accessToken) {
      return NextResponse.json({ error: "Missing Meta configuration" }, { status: 500 })
    }

    const payload = {
      data: [
        {
          event_name: body.eventName,
          event_id: body.eventId,
          event_time: body.eventTime || Math.floor(Date.now() / 1000),
          action_source: "website",
          user_data: {
            em: sha256(body.email),
            ph: sha256(body.phone),
            fn: sha256(body.firstName),
            ln: sha256(body.lastName),
            ct: sha256(body.city || telemetry.city || undefined),
            st: sha256(body.region || telemetry.region || undefined),
            country: sha256(body.country || telemetry.country || undefined),
            client_ip_address: telemetry.ip,
            client_user_agent: telemetry.userAgent,
            fbp: body.fbp || telemetry.fbp,
            fbc: body.fbc || telemetry.fbc,
          },
          custom_data: {
            value: body.value,
            currency: body.currency,
            content_name: body.contentName,
            content_category: body.contentCategory,
          },
        },
      ],
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Meta CAPI error: ${errorText}`)
    }

    const metaResponse = await response.json()

    return NextResponse.json({
      success: true,
      eventId: body.eventId,
      metaResponse,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 })
    }

    console.error("Track error:", error)
    return NextResponse.json(
      { error: "Failed to send event to Meta", details: (error as Error).message },
      { status: 500 }
    )
  }
}
