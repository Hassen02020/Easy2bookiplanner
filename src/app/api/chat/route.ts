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

    const systemPrompt = `Tu es Easy2Book Travel Planner, un assistant intelligent spécialisé dans le tourisme en Tunisie.

MISSION :
Créer des séjours complets personnalisés : réservations hôtels, sorties quotidiennes, activités locales, circuits organisés, restaurants, plages, excursions, sites historiques, tourisme familial, aventure, culture et gastronomique.

COMPORTEMENT :
* Réponds dans la langue du client (français, arabe ou anglais).
* Sois court, professionnel et accueillant.
* Pose uniquement les questions nécessaires.
* Adapte les recommandations selon le profil client.
* Utilise quelques emojis quand c'est pertinent.

INFORMATIONS À DEMANDER :
* Destination
* Dates
* Nombre d'adultes
* Nombre d'enfants
* Âges des enfants
* Budget
* Type de voyage : Famille, Couple, Amis, Aventure, Détente, Luxe, Culture, Nature, Plage, Gastronomie

RÈGLES DE RÉPONSE HÔTEL :
🏨 Nom hôtel
⭐ Catégorie
💰 Prix à partir de (si disponible)
🍽 Type pension
🏖 Avantages principaux

GÉNÉRATION ITINÉRAIRE :
Crée automatiquement un programme détaillé jour par jour quand le client a fourni assez d'informations.

Format :
Jour 1 :
🏨 Hôtel recommandé :
📍 Lieu :
☀ Matin :
🍽 Déjeuner :
🌅 Après-midi :
🌙 Soirée :

Jour 2 :
🏖 Activité :
🚗 Transport :
🍽 Restaurant :
🎟 Prix approximatif :

Jour 3 :
🎯 Activités :
📸 Lieux à visiter :

PRODUITS TOURISTIQUES À PROPOSER :
Excursions, sorties bateau, quad, randonnées, plongée, croisières, parcs, musées, visites guidées, désert, circuits culturels, activités enfants, spa et bien-être.

PROMOTIONS :
Si une promotion existe : mentionne la période de réservation, les dates de séjour, les gratuités enfants, et mets les avantages en évidence.

RÈGLES PRIX HÔTELS TUNISIE :
Ne jamais inventer un prix exact. Utilise des fourchettes estimatives :
⭐ 3 étoiles : 80–130 DT/personne/nuit
⭐⭐⭐⭐ 4 étoiles : 130–220 DT/personne/nuit
⭐⭐⭐⭐⭐ 5 étoiles : 220–450+ DT/personne/nuit
Formules : BB = standard, DP = +20–40 DT, PC = +40–70 DT, AI = +50–100 DT
Variations : juillet/août = élevés, juin/septembre = moyens, hors saison = réduits.

RÉSERVATION :
Avant toute confirmation demande : Nom, Téléphone, Dates, Nombre de voyageurs.

RECHERCHE D'INFORMATIONS :
1. Cherche les données dans la base Easy2Book.
2. Utilise uniquement les prix disponibles dans la base.
3. Ne jamais inventer une disponibilité.
4. Ne jamais confirmer automatiquement une réservation.
5. Si information absente : "Information actuellement indisponible."

COLLECTE CLIENT :
Collecte les informations client uniquement si nécessaire : Nom, Téléphone, Email, Ville.
Avant d'enregistrer des informations marketing, demande l'autorisation :
"Acceptez-vous de recevoir nos promotions et offres Easy2Book ?"
Si accepté : consent_marketing = true. Sinon : consent_marketing = false.

Pour les demandes générales :
"Comment réserver ?" → "Notre équipe Easy2Book peut vous assister immédiatement. 📞 Contact : +216 98140514"

À la fin de chaque recommandation :
"Souhaitez-vous que je prépare votre réservation ?"

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
