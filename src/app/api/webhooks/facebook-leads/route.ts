import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { normalizePhone, isValidTunisianPhone } from "@/lib/phone"
import { getTelemetryData } from "@/lib/telemetry"

/**
 * Webhook Meta Lead Ads - /api/webhooks/facebook-leads
 *
 * Cette route gère :
 * 1. La validation initiale du webhook (GET) avec hub.verify_token et hub.challenge.
 * 2. La réception des événements de leads (POST) avec lead_gen_id.
 * 3. La récupération des champs du lead via l'API Graph Meta.
 * 4. Le nettoyage du numéro tunisien et la préparation pour l'équipe commerciale.
 * 5. La vérification de signature X-Hub-Signature-256 pour la sécurité.
 */

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "easy2book-verify-token"
const APP_SECRET = process.env.META_APP_SECRET
const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN

interface FacebookLeadField {
  name: string
  values: string[]
}

interface FacebookLeadData {
  id: string
  created_time: string
  ad_id?: string
  form_id?: string
  field_data?: FacebookLeadField[]
}

interface FacebookWebhookEntry {
  id: string
  time: number
  changes?: Array<{
    value: {
      leadgen_id: string
      page_id: string
      form_id: string
      adgroup_id?: string
      ad_id?: string
      created_time: number
    }
    field: string
  }>
}

interface FacebookWebhookBody {
  object: string
  entry: FacebookWebhookEntry[]
}

function getFieldValue(fieldData: FacebookLeadField[] | undefined, fieldName: string): string | null {
  if (!fieldData) return null
  const field = fieldData.find((f) => f.name.toLowerCase() === fieldName.toLowerCase())
  return field?.values[0] || null
}

function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !APP_SECRET) return false

  const expectedSignature = `sha256=${createHmac("sha256", APP_SECRET).update(payload, "utf8").digest("hex")}`

  try {
    return signature === expectedSignature
  } catch {
    return false
  }
}

async function fetchLeadFromGraph(leadGenId: string): Promise<FacebookLeadData | null> {
  if (!PAGE_ACCESS_TOKEN) {
    throw new Error("FB_PAGE_ACCESS_TOKEN is missing")
  }

  const url = `https://graph.facebook.com/v18.0/${leadGenId}?access_token=${PAGE_ACCESS_TOKEN}`
  const response = await fetch(url)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Meta Graph API error: ${errorText}`)
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Vérification du webhook échouée." }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-hub-signature-256")

    if (APP_SECRET && !verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Signature invalide." }, { status: 401 })
    }

    const body: FacebookWebhookBody = JSON.parse(rawBody)

    if (body.object !== "page") {
      return NextResponse.json({ error: "Objet webhook non supporté." }, { status: 400 })
    }

    const telemetry = await getTelemetryData()
    const results: Array<{
      leadGenId: string
      fullName: string | null
      phone: string | null
      normalizedPhone: string | null
      email: string | null
      isValid: boolean
      error?: string
    }> = []

    for (const entry of body.entry) {
      const changes = entry.changes || []

      for (const change of changes) {
        const leadGenId = change.value?.leadgen_id
        if (!leadGenId) continue

        try {
          const leadData = await fetchLeadFromGraph(leadGenId)

          if (!leadData) {
            results.push({
              leadGenId,
              fullName: null,
              phone: null,
              normalizedPhone: null,
              email: null,
              isValid: false,
              error: "Impossible de récupérer les données du lead.",
            })
            continue
          }

          const fullName =
            getFieldValue(leadData.field_data, "full_name") ||
            `${getFieldValue(leadData.field_data, "first_name") || ""} ${getFieldValue(leadData.field_data, "last_name") || ""}`.trim() ||
            null

          const rawPhone = getFieldValue(leadData.field_data, "phone_number")
          const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null
          const isValid = normalizedPhone ? isValidTunisianPhone(normalizedPhone) : false

          const email = getFieldValue(leadData.field_data, "email")

          // Log sécurisé pour suivi (sans données brutes en production)
          console.log("Lead Meta reçu:", {
            leadGenId,
            isValid,
            pageId: change.value.page_id,
            formId: change.value.form_id,
            clientIp: telemetry.ip,
            clientUserAgent: telemetry.userAgent,
          })

          results.push({
            leadGenId,
            fullName,
            phone: rawPhone,
            normalizedPhone,
            email,
            isValid,
          })
        } catch (error) {
          console.error(`Erreur traitement lead ${leadGenId}:`, error)
          results.push({
            leadGenId,
            fullName: null,
            phone: null,
            normalizedPhone: null,
            email: null,
            isValid: false,
            error: (error as Error).message,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("Webhook Facebook Leads error:", error)
    return NextResponse.json(
      {
        error: "Échec du traitement du webhook.",
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
