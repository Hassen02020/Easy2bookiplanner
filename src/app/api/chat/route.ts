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
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || "",
    })

    const lastMessage = messages[messages.length - 1]
    const userMessage = lastMessage?.content || ""

    const systemPrompt = `Tu es Easy2Book Assistant, l'assistant officiel de l'agence Easy2Book spécialisée dans les réservations d'hôtels et séjours en Tunisie.

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

RECHERCHE D'INFORMATIONS :
1. Cherche les informations dans la base de données interne.
2. Utilise les prix stockés dans la base.
3. Utilise les promotions actives uniquement.
4. Si une information n'existe pas dans la base : "Information non disponible actuellement."

COLLECTE CLIENT :
Collecte les informations client uniquement si nécessaire : Nom, Téléphone, Email, Ville.
Avant d'enregistrer des informations marketing, demande l'autorisation :
"Acceptez-vous de recevoir nos promotions et offres Easy2Book ?"
Si le client accepte : consent_marketing = true
Sinon : consent_marketing = false

Ne jamais inventer : prix, disponibilité, réservations confirmées.

Pour les demandes générales :
"Comment réserver ?" → "Notre équipe Easy2Book peut vous assister immédiatement. 📞 Contact : +216 98140514"

RÈGLES PRIX HÔTELS TUNISIE :
Lorsque le client demande un prix hôtel en Tunisie :
Ne jamais inventer un prix exact. Utilise des fourchettes estimatives selon catégorie :

⭐ Hôtel 3 étoiles : 💰 Environ 80–130 DT/personne/nuit
⭐⭐⭐⭐ Hôtel 4 étoiles : 💰 Environ 130–220 DT/personne/nuit
⭐⭐⭐⭐⭐ Hôtel 5 étoiles : 💰 Environ 220–450+ DT/personne/nuit

Pour les formules :
🍽 Logement + Petit déjeuner : prix standard
🍽 Demi-pension : +20–40 DT environ
🍽 Pension complète : +40–70 DT environ
🍽 All Inclusive : +50–100 DT environ

Variations à prendre en compte :
* Juillet / août → prix élevés
* Juin / septembre → prix moyens
* Hors saison → prix réduits
* Promotions enfants possibles
* Week-ends et jours fériés peuvent augmenter les tarifs

Toujours terminer par :
📞 Easy2Book : +216 98140514`

    const conversationHistory = messages.slice(-6).map((m: { role: string; content: string }) => 
      `${m.role === "assistant" ? "Assistant" : "Client"}: ${m.content}`
    ).join("\n")

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}

Historique de la conversation :
${conversationHistory}

Question client :
${userMessage}
`,
    })

    const responseText = response.text

    return NextResponse.json({
      content: responseText || "Désolé, je n'ai pas pu générer une réponse. Contactez-nous au 📞 +216 98140514.",
      lang,
      telemetry,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 })
    }

    console.error("Chat error:", error)
    const errorMsg = (error as Error).message || ""
    
    if (errorMsg.includes("429") || errorMsg.includes("quota")) {
      return NextResponse.json({
        content: "Notre service est temporairement surchargé. Pour une assistance immédiate, contactez-nous au 📞 +216 98140514.",
        telemetry: await getTelemetryData(),
      })
    }

    if (errorMsg.includes("API_KEY") || errorMsg.includes("api key") || errorMsg.includes("401") || errorMsg.includes("403")) {
      return NextResponse.json({
        content: "Notre assistant IA est en cours de configuration. Pour toute demande, contactez-nous au 📞 +216 98140514.",
        telemetry: await getTelemetryData(),
      })
    }

    return NextResponse.json({
      content: "Une erreur est survenue. Pour une assistance immédiate, contactez-nous au 📞 +216 98140514.",
      telemetry: await getTelemetryData(),
    })
  }
}
