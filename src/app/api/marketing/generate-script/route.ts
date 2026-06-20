import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/db"
import { hotels, hotelTranslations, organizedTrips, organizedTripTranslations } from "@/db/schema"
import { eq, and, gte, sql, isNull, or } from "drizzle-orm"
import { calculateDisplayPrice } from "@/lib/pricing"

/**
 * POST /api/marketing/generate-script
 *
 * Génère un script de vidéo publicitaire (Reels/TikTok) pour Easy2Book.
 * 1. Reçoit une catégorie et une destination.
 * 2. Interroge la base et applique les pricing_rules actives.
 * 3. Génère un script structuré (Hook / Corps / CTA) avec GPT-4o.
 * 4. Retourne le script, les suggestions visuelles B-roll et le prix exact utilisé.
 */

const requestSchema = z.object({
  category: z.enum(["omra", "voyage_organise", "hotel"]),
  destination: z.string().min(1),
  durationSeconds: z.number().min(15).max(90).optional().default(30),
})

async function getOpenAI() {
  const { default: OpenAI } = await import("openai")
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

interface OfferData {
  title: string
  description: string | null
  destination: string
  category: string
  rawPrice: number
  finalPrice: number
  currency: string
  details?: string[]
}

async function findBestOffer(
  category: "omra" | "voyage_organise" | "hotel",
  destination: string
): Promise<OfferData | null> {
  if (category === "hotel") {
    const rows = await db
      .select({
        title: hotelTranslations.name,
        description: hotelTranslations.description,
        destination: hotels.destination,
        rawPrice: hotels.basePricePerNight,
      })
      .from(hotels)
      .innerJoin(hotelTranslations, eq(hotels.id, hotelTranslations.hotelId))
      .where(
        and(
          eq(hotels.isActive, true),
          eq(hotelTranslations.language, "fr"),
          sql`${hotels.destination} ILIKE ${`%${destination}%`}`
        )
      )
      .limit(1)

    const row = rows[0]
    if (!row) return null

    const rawPrice = Number(row.rawPrice)
    const finalPrice = await calculateDisplayPrice("hotel", rawPrice, row.destination, "hotel")

    return {
      title: row.title,
      description: row.description,
      destination: row.destination,
      category: "hotel",
      rawPrice,
      finalPrice,
      currency: "TND",
    }
  }

  const tripCategory = category === "omra" ? "omra" : "generic"
  const rows = await db
    .select({
      title: organizedTripTranslations.title,
      description: organizedTripTranslations.description,
      includedServices: organizedTripTranslations.includedServices,
      rawPrice: organizedTrips.price,
      departureDate: organizedTrips.departureDate,
      returnDate: organizedTrips.returnDate,
    })
    .from(organizedTrips)
    .innerJoin(organizedTripTranslations, eq(organizedTrips.id, organizedTripTranslations.tripId))
    .where(
      and(
        eq(organizedTripTranslations.language, "fr"),
        gte(organizedTrips.availableSeats, 1),
        sql`${organizedTripTranslations.title} ILIKE ${`%${destination}%`}`
      )
    )
    .limit(1)

  const row = rows[0]
  if (!row) return null

  const rawPrice = Number(row.rawPrice)
  const finalPrice = await calculateDisplayPrice("trip", rawPrice, destination, tripCategory)

  return {
    title: row.title,
    description: row.description,
    destination,
    category: tripCategory,
    rawPrice,
    finalPrice,
    currency: "TND",
    details: Array.isArray(row.includedServices) ? row.includedServices.map(String) : undefined,
  }
}

function buildScriptPrompt(offer: OfferData, durationSeconds: number): string {
  return `Tu es un copywriter spécialisé dans les agences de voyage tunisiennes.

Rédige un script de vidéo publicitaire pour ${durationSeconds} secondes (Facebook Reels / TikTok) dans un style tunisien naturel : mélange fluide de français et de darja tunisienne (arabe dialectal), parlé, simple, énergique et engageant.

Offre à promouvoir :
- Titre : ${offer.title}
- Destination : ${offer.destination}
- Catégorie : ${offer.category}
- Prix affiché : À partir de ${offer.finalPrice.toFixed(2)} ${offer.currency}
- Description : ${offer.description || "Package exclusif Easy2Book"}
- Détails inclus : ${offer.details?.join(", ") || "vols, hébergement, transferts"}

Structure obligatoire du script :
1. HOOK (0-5s) : accroche percutante qui capte l'attention immédiatement.
2. CORPS (5-25s) : avantages du package, émotion, preuve sociale, offre limitée.
3. CTA (25-30s) : appel à l'action clair vers le chat IA Easy2Book ou WhatsApp pour réserver et obtenir le devis final.

Règles :
- Prix indicatif uniquement. Mentionne "à partir de" et "devis final sur WhatsApp".
- Ne référence jamais des concurrents.
- Utilise des phrases courtes, faciles à lire à voix haute.
- Ton : chaleureux, urgent, fiable.

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "hook": "...",
  "body": "...",
  "cta": "...",
  "visualSuggestions": ["plan 1", "plan 2", "plan 3"],
  "captions": ["texte à afficher à l'écran 1", "texte à afficher à l'écran 2"],
  "musicMood": "..."
}`
}

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json())
    const { category, destination, durationSeconds } = body

    const offer = await findBestOffer(category, destination)

    if (!offer) {
      return NextResponse.json(
        { error: "Aucune offre trouvée pour cette catégorie et destination." },
        { status: 404 }
      )
    }

    const openai = await getOpenAI()

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Tu es un expert en marketing digital pour les agences de voyage tunisiennes. Tu rédiges des scripts publicitaires courts, percutants, adaptés aux Reels et TikTok, en mélangeant français et darja tunisienne.",
        },
        {
          role: "user",
          content: buildScriptPrompt(offer, durationSeconds),
        },
      ],
      temperature: 0.85,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    })

    const rawContent = completion.choices[0]?.message?.content?.trim() || "{}"
    const scriptData = JSON.parse(rawContent)

    return NextResponse.json({
      script: scriptData,
      offer: {
        title: offer.title,
        destination: offer.destination,
        category: offer.category,
        rawPrice: offer.rawPrice,
        finalPrice: offer.finalPrice,
        currency: offer.currency,
        details: offer.details,
      },
      durationSeconds,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide", details: error.errors }, { status: 400 })
    }

    console.error("Marketing script generation error:", error)
    return NextResponse.json(
      {
        error: "Échec de la génération du script.",
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
