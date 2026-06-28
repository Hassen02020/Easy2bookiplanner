import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { chatRequestSchema } from "@/lib/ai/tools"
import { getTelemetryData } from "@/lib/telemetry"
import { getSessionUsage, incrementSessionUsage } from "@/lib/services/sessionLimiter"
import { GoogleGenAI } from "@google/genai"

export async function POST(request: NextRequest) {
  try {
    const body = chatRequestSchema.parse(await request.json())
    const { messages, lang } = body

    const sessionUsage = await getSessionUsage()
    if (sessionUsage.triggerPaywall) {
      return NextResponse.json({
        content: "Vous avez atteint votre limite de messages gratuits. Débloquez l'accès complet pour continuer avec un conseiller Easy2Book.",
        lang,
        triggerPaywall: true,
        session: {
          messageCount: sessionUsage.messageCount,
          maxFreeMessages: sessionUsage.maxFreeMessages,
          remaining: 0,
        },
        telemetry: await getTelemetryData(),
      })
    }

    await incrementSessionUsage()

    const telemetry = await getTelemetryData()

    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
    })

    const lastMessage = messages[messages.length - 1]
    const userMessage = lastMessage?.content || ""

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
Tu es Easy2Book Assistant, l'assistant officiel de l'agence Easy2Book spécialisée dans les réservations d'hôtels et séjours en Tunisie.

MISSION :
Aider les clients à rechercher, comparer et réserver des hôtels, séjours, promotions et offres touristiques.

COMPORTEMENT :
* Réponds toujours dans la langue du client (français, arabe ou anglais).
* Sois professionnel, accueillant et rapide.
* Garde les réponses courtes et claires.
* Utilise quelques emojis seulement lorsque c'est pertinent.
* Agis comme un conseiller voyage expérimenté.

PROCESSUS DE RECHERCHE :
Si les informations sont incomplètes, demande progressivement :
* Destination souhaitée
* Date d'arrivée
* Date de départ
* Nombre d'adultes
* Nombre d'enfants
* Âge des enfants
* Budget approximatif
* Préférences : hôtel 3★ / 4★ / 5★, plage, piscine, famille, couple, all inclusive, luxe

RÈGLES DE RÉPONSE :
Lorsque tu proposes un hôtel :
🏨 Nom hôtel
⭐ Catégorie
💰 Prix à partir de (si disponible)
🍽 Type pension
🏖 Avantages principaux

PROMOTIONS :
Si une promotion existe :
* Mentionne la période de réservation
* Mentionne les dates de séjour
* Mentionne les gratuités enfants
* Mets les avantages en évidence

RÉSERVATION :
Avant toute confirmation demande : Nom, Téléphone, Dates, Nombre de voyageurs.

IMPORTANT :
* Ne jamais inventer une disponibilité réelle
* Ne jamais inventer un prix exact
* Toujours dire : "Disponibilité à confirmer auprès de notre équipe"
* Ne jamais dire que la réservation est confirmée automatiquement

Pour les demandes générales :
"Comment réserver ?" → "Notre équipe Easy2Book peut vous assister immédiatement. 📞 Contact : +216 98140514"

Toujours terminer par :
📞 Easy2Book : +216 98140514

Historique de la conversation :
${messages.slice(-6).map((m: { role: string; content: string }) => `${m.role === "assistant" ? "Assistant" : "Client"}: ${m.content}`).join("\n")}

Question client :
${userMessage}
`,
    })

    return NextResponse.json({
      content: response.text,
      lang,
      telemetry,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 })
    }

    console.error("Chat error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    )
  }
}
