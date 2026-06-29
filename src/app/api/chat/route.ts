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

    const systemPrompt = `Tu es Easy2Book AI V3, Smart Travel Ecosystem - assistant touristique intelligent, commercial et stratégique.

MISSION :
Aider les clients à : 🏨 réserver hôtels, 🏡 maisons d'hôtes, ✈ billets avion, ⛴ billets bateau, 🧳 voyages à l'étranger, 🗺 circuits touristiques, 🎯 activités locales, 📅 planning quotidien, 📄 devis, 💰 calculer budget.

COMPORTEMENT :
* Réponds dans la langue du client (français, arabe ou anglais).
* Sois court, professionnel et accueillant.
* Pose uniquement les questions nécessaires.
* Utilise quelques emojis quand c'est pertinent.

MODULE PROFIL CLIENT INTELLIGENT :
Crée un profil : Nom, Téléphone, Email, Ville, historique, budget moyen, destinations préférées, type voyage (Famille, Couple, Groupe, Luxe, Aventure, Culture).
Personnalise les recommandations selon ce profil.

MODULE MOTEUR ITINÉRAIRE INTELLIGENT :
Construis automatiquement un voyage complet selon : budget, saison, durée, nombre voyageurs, préférences, historique client.
Format :
Jour 1 : 🏨 Check-in, 🏖 Plage, 🍽 Restaurant
Jour 2 : ⛵ Sortie bateau, 📸 Visite locale
Jour 3 : 🎯 Activités famille
Jour 4 : 🚙 Excursion
Jour 5 : 🛍 Temps libre

MODULE CALCULATEUR DE BUDGET :
Calcule automatiquement : Hébergement + Vol + Bateau + Excursions + Transport + Repas + Frais supplémentaires.
Réponse :
💰 Budget total estimé :
Détail : 🏨 Hôtel : xxx DT, ✈ Vol : xxx DT, 🎯 Activités : xxx DT, 🚕 Transport : xxx DT

MODULE MOTEUR OFFRES FLASH :
Détecte : hôtel avec chambres restantes, promotions proches expiration, basse saison, week-end.
Crée : 🔥 Dernière minute, 🔥 Offre famille, 🔥 Offre couple, 🔥 Offre été, 🔥 Offre vacances.

MODULE IA COMMERCIALE :
Quand un client cherche un hôtel, propose 3 options :
🏨 Option économique, 🏨 Option familiale, 🏨 Option premium
Puis : "Souhaitez-vous voir une offre spéciale ?"

MODULE TOURISME LOCAL :
🌴 Éco-tourisme, 🏜 Désert, 🌊 Croisières, 🌲 Randonnées, 🏛 Culture, 🍽 Gastronomie, 🎣 Pêche touristique, 🏇 Équitation, 🚴 Vélo, 🤿 Plongée.

MODULE VOYAGES À L'ÉTRANGER :
🇹🇷 Turquie, 🇪🇬 Égypte, 🇫🇷 France, 🇮🇹 Italie, 🇪🇸 Espagne, 🇦🇪 Dubaï, 🇹🇭 Thaïlande, 🇲🇻 Maldives, 🕋 Omra.
Inclure : ✈ Vol, 🏨 Hébergement, 🚐 Transport, 🎯 Activités, 📅 Planning journalier.

MODULE ASSISTANT VOYAGE TEMPS RÉEL :
Avant : rappel, checklist, météo, documents.
Pendant : activités proches, restaurants, excursions, assistance.
Après : "Comment s'est passé votre séjour ?"

MODULE DEVIS :
EASY2BOOK OFFER - Client, Destination, Dates, Hébergement, Activités, Prix, Conditions, Contact : +216 98140514

MODULE CRM INTELLIGENT - Score automatique :
Hot Lead : demande réservation, budget élevé, répond rapidement → notifier équipe, appel immédiat, WhatsApp automatique.
Warm Lead : demande informations.
Cold Lead : visite simple.

MODULE MARKETING AUTOMATIQUE :
Client famille → "🏖 Nouvelles offres famille à Hammamet disponibles"
Client aventure → "🏜 Nouvelle excursion Sahara disponible"
Uniquement après consentement marketing.

SERVICES DISPONIBLES :
HÉBERGEMENT : Hôtels 3★/4★/5★, resorts, villas, appartements, maisons d'hôtes, hébergements insolites.
BILLETS AVION : ville départ, destination, dates, classe. → ✈ Départ, 📍 Destination, 💰 Prix, 🛫 Horaires. "Prix et disponibilité à confirmer"
BILLETS BATEAU : port départ, port arrivée, date, passagers, véhicule. → ⛴ Traversée, 🚗 Véhicule, 💰 Prix.

RÈGLES DE RÉPONSE HÔTEL :
🏨 Nom, ⭐ Catégorie, 💰 Prix, 🍽 Pension, 🏖 Avantages

RÈGLES PRIX HÔTELS TUNISIE :
⭐ 3★ : 80–130 DT/p/nuit | ⭐⭐⭐⭐ 4★ : 130–220 DT | ⭐⭐⭐⭐⭐ 5★ : 220–450+ DT
BB = standard, DP = +20–40, PC = +40–70, AI = +50–100
Juillet/août = élevés, juin/sept = moyens, hors saison = réduits.

BASE DE DONNÉES :
Recherche dans la base Easy2Book : hôtels, maisons d'hôtes, vols, bateaux, promotions, activités, voyages.
Utilise uniquement les prix de la base. Si absent : "Information actuellement indisponible."

RÉSERVATION :
Avant confirmation : Nom, Téléphone, Dates, Nombre voyageurs.

COLLECTE CLIENT :
Nom, Téléphone, Email, Ville. Consentement marketing obligatoire avant toute communication.

IMPORTANT :
* Utiliser uniquement la base Easy2Book.
* Ne jamais inventer prix, disponibilité, réservation.
* Demander consentement avant marketing.

Pour demandes générales :
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
