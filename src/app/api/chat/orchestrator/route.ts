import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { calculateDisplayPrice } from "@/lib/pricing"
import { checkAvailability } from "@/db/inventory"
import { db } from "@/db"
import { packageInventory } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"

/**
 * POST /api/chat/orchestrator
 *
 * Orchestrateur central du chat Easy2Book.
 * 1. Analyse la demande utilisateur pour en extraire la catégorie et la destination.
 * 2. Injecte les données réelles : prix après règles de marge et disponibilité des stocks.
 * 3. Génère une réponse personnalisée via GPT-4o avec miroir linguistique Derja/Français.
 * 4. Retourne un JSON structuré avec le message de l'IA et des flags pour le frontend.
 */

const requestSchema = z.object({
  message: z.string().min(1),
  lang: z.enum(["fr", "en", "ar"]).optional().default("fr"),
})

export type SupportedLanguage = "fr" | "en" | "ar"

async function getOpenAI() {
  const { default: OpenAI } = await import("openai")
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

interface Intent {
  category: "omra" | "voyage" | "hotel" | "generic"
  destination: string | null
  language: SupportedLanguage
}

function detectIntent(text: string, preferredLang: SupportedLanguage): Intent {
  const lower = text.toLowerCase()

  // Détection linguistique simple
  const arabicRegex = /[\u0600-\u06FF]/
  const language: SupportedLanguage = arabicRegex.test(text) ? "ar" : preferredLang

  // Détection Omra
  if (/\b(omra|oumra|umrah|عمرة|hajj|حج)\b/.test(lower)) {
    return { category: "omra", destination: null, language }
  }

  // Détection Hôtel
  if (/\b(hotel|hôtel|فندق|نزل)\b/.test(lower)) {
    const destinations = ["hammamet", "sousse", "djerba", "tabarka", "tunis"]
    const found = destinations.find((d) => lower.includes(d))
    return { category: "hotel", destination: found ? found.charAt(0).toUpperCase() + found.slice(1) : null, language }
  }

  // Détection Voyage organisé
  const destinations = [
    { name: "Istanbul", aliases: ["istanbul", "istambul", "استنبول"] },
    { name: "Cap-Vert", aliases: ["cap-vert", "cap vert", "capverde", "كاب فيردي"] },
    { name: "Turquie", aliases: ["turquie", "turkey", "تركيا"] },
  ]

  for (const dest of destinations) {
    if (dest.aliases.some((alias) => lower.includes(alias))) {
      return { category: "voyage", destination: dest.name, language }
    }
  }

  return { category: "generic", destination: null, language }
}

async function findInventoryPackage(
  category: string,
  destination: string | null
): Promise<string | null> {
  const conditions = [eq(packageInventory.category, category)]

  if (destination) {
    conditions.push(
      sql`${packageInventory.destination} ILIKE ${`%${destination}%`}`
    )
  }

  const rows = await db
    .select({ id: packageInventory.id })
    .from(packageInventory)
    .where(and(...conditions))
    .limit(1)

  return rows[0]?.id || null
}

function buildSystemPrompt(
  lang: SupportedLanguage,
  price: number,
  availability: { available: boolean; triggerUrgence: boolean; remaining: number },
  category: string,
  destination: string | null
): string {
  const basePrice = `${price.toFixed(2)} TND`
  const urgency = availability.triggerUrgence
    ? `Attention : il ne reste plus que ${availability.remaining} place(s).`
    : availability.available
    ? `Places disponibles : ${availability.remaining}.`
    : "Ce package est actuellement complet."

  const context = `Tu es un conseiller voyage Easy2Book. Catégorie : ${category}. Destination : ${destination || "non précisée"}. Prix indicatif : ${basePrice}. ${urgency}`

  if (lang === "ar") {
    return `${context}

Règles :
- Réponds en darja tunisienne ou en arabe moderne, selon le ton de l'utilisateur.
- Mentionne le prix comme "à partir de ${basePrice}" et dis que le devis final se fait sur WhatsApp.
- Si les places sont en urgence, insiste poliment pour que l'utilisateur réserve vite.
- Reste chaleureux, concis et professionnel.
- Ne promets jamais de prix final fixe.`
  }

  return `${context}

Règles :
- Réponds en français ou en mélange français/darja tunisienne si le ton de l'utilisateur est familier.
- Mentionne le prix comme "À partir de ${basePrice}" et oriente vers WhatsApp pour le devis final.
- Si les places sont en urgence, crée une légère pression sans être agressif.
- Reste chaleureux, concis et professionnel.
- Ne promets jamais de prix final fixe.
- Si l'utilisateur semble intéressé, propose de remplir le formulaire pour recevoir le devis sur WhatsApp.`
}

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json())
    const { message, lang } = body

    const intent = detectIntent(message, lang)
    const category = intent.category
    const destination = intent.destination

    // Calcul du prix réel via le moteur de tarification
    const rawPrice = category === "hotel" ? 320 : category === "omra" ? 4200 : 1890
    const serviceType: "hotel" | "flight" | "trip" = category === "hotel" ? "hotel" : "trip"

    const finalPrice = await calculateDisplayPrice(
      serviceType,
      rawPrice,
      destination,
      category === "generic" ? "generic" : category
    )

    // Disponibilité des stocks
    const packageId = await findInventoryPackage(category, destination)
    const availability = packageId
      ? await checkAvailability(packageId)
      : { available: true, triggerUrgence: false, remaining: 0, total: 0, isSoldOut: false }

    // Génération de la réponse avec GPT-4o
    const openai = await getOpenAI()
    const systemPrompt = buildSystemPrompt(
      intent.language,
      finalPrice,
      availability,
      category,
      destination
    )

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.75,
      max_tokens: 600,
    })

    const aiMessage = completion.choices[0]?.message?.content?.trim() || ""

    // Détermination des flags frontend
    const showBookingForm = availability.available && !availability.isSoldOut
    const showUrgency = availability.triggerUrgence

    return NextResponse.json({
      message: aiMessage,
      intent,
      flags: {
        showBookingForm,
        showUrgency,
        isSoldOut: availability.isSoldOut,
        currentPrice: finalPrice,
        currency: "TND",
        remainingSlots: availability.remaining,
        category,
        destination,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide", details: error.errors }, { status: 400 })
    }

    console.error("Chat orchestrator error:", error)
    return NextResponse.json(
      {
        error: "Échec de l'orchestration du chat.",
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
