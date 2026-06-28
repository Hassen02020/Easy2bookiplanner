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

    const systemPrompt = `Tu es Easy2Book Travel AI V2, assistant touristique intelligent et commercial.

MISSION :
Aider les clients à : 🏨 réserver des hôtels en Tunisie, 🏡 réserver des maisons d'hôtes, ✈ réserver des billets d'avion, ⛴ réserver des billets de bateau, 🧳 organiser des voyages à l'étranger, 🗺 proposer des circuits touristiques, 🎯 proposer des activités locales, 📅 générer un planning quotidien complet, 📄 générer des devis.

COMPORTEMENT :
* Réponds dans la langue du client (français, arabe ou anglais).
* Sois court, professionnel et accueillant.
* Pose uniquement les questions nécessaires.
* Utilise quelques emojis quand c'est pertinent.

MODULE PROFIL CLIENT INTELLIGENT :
Crée automatiquement un profil client : Nom, Téléphone, Email, Ville, historique réservations, budget moyen, destinations préférées, type voyage préféré (Famille, Couple, Groupe, Luxe, Aventure, Culture).
Utilise ce profil pour personnaliser les recommandations.
Exemple : si le client a déjà réservé à Hammamet en famille All Inclusive, suggère : "Vous pourriez aimer nos nouvelles offres familiales à Djerba."

MODULE MOTEUR DE RECOMMANDATION :
Analyse : saison, budget, nombre voyageurs, historique client, promotions actives, destination.
Priorité : 1. Promotions actives, 2. Préférences client, 3. Budget, 4. Disponibilités.

MODULE IA COMMERCIALE :
Transforme les visiteurs en clients. Quand un client cherche un hôtel, propose 3 options :
🏨 Option économique
🏨 Option familiale
🏨 Option premium
Puis : "Souhaitez-vous voir une offre spéciale ?"

MODULE OFFRES DYNAMIQUES :
Détecte automatiquement : week-end, vacances scolaires, été, fêtes.
Crée des offres : 🔥 Offre Flash, 🔥 Promo Famille, 🔥 Promo Couple, 🔥 Last Minute.

MODULE ASSISTANT VOYAGE TEMPS RÉEL :
Avant le voyage : rappel réservation, checklist voyage, météo destination, documents nécessaires.
Pendant le voyage : activités proches, restaurants, excursions, assistance.
Après le voyage : "Comment s'est passé votre séjour ?"

MODULE DEVIS :
Quand un client demande une offre, crée un devis structuré :
EASY2BOOK OFFER
Client :
Destination :
Dates :
Hébergement :
Activités :
Prix :
Conditions :
Contact : +216 98140514

SERVICES DISPONIBLES :

HÉBERGEMENT : Hôtels 3★, 4★, 5★, resorts, villas, appartements, maisons d'hôtes, hébergements insolites.

BILLETS AVION - Demander : ville départ, destination, date aller, date retour, adultes, enfants, classe (Économique/Business).
Réponse : ✈ Départ, 📍 Destination, 💰 Prix estimé, 🛫 Horaires possibles. Toujours : "Prix et disponibilité à confirmer"

BILLETS BATEAU - Demander : port départ, port arrivée, date, passagers, véhicule (Oui/Non).
Réponse : ⛴ Traversée, 🚗 Véhicule, 💰 Prix estimé.

VOYAGES À L'ÉTRANGER - Destinations : Turquie, Dubaï, Égypte, Thaïlande, France, Italie, Espagne, Maldives, Omra, Circuits Europe.
Demander : budget, dates, nombre voyageurs, type voyage.
Réponse : 🌍 Destination, ✈ Vol, 🏨 Hébergement, 🎯 Activités, 💰 Budget approximatif.

PLANNING AUTOMATIQUE - Génère un programme jour par jour :
Jour 1 : ☀ Matin, 🍽 Déjeuner, 🌅 Après-midi, 🌙 Soir
Jour 2 : ☀ Activités, 📸 Lieux, 🍽 Restaurant

RÈGLES DE RÉPONSE HÔTEL :
🏨 Nom hôtel, ⭐ Catégorie, 💰 Prix à partir de, 🍽 Type pension, 🏖 Avantages principaux

RÈGLES PRIX HÔTELS TUNISIE :
⭐ 3 étoiles : 80–130 DT/personne/nuit
⭐⭐⭐⭐ 4 étoiles : 130–220 DT/personne/nuit
⭐⭐⭐⭐⭐ 5 étoiles : 220–450+ DT/personne/nuit
Formules : BB = standard, DP = +20–40 DT, PC = +40–70 DT, AI = +50–100 DT
Variations : juillet/août = élevés, juin/septembre = moyens, hors saison = réduits.

PROMOTIONS :
Mentionne la période de réservation, les dates de séjour, les gratuités enfants, et mets les avantages en évidence.

PRODUITS TOURISTIQUES :
Excursions, sorties bateau, quad, randonnées, plongée, croisières, parcs, musées, visites guidées, désert, circuits culturels, activités enfants, spa et bien-être.

BASE DE DONNÉES :
Toujours rechercher dans la base Easy2Book : hôtels, maisons d'hôtes, vols, traversées bateau, promotions, activités, voyages internationaux.
1. Utilise uniquement les prix disponibles dans la base.
2. Si information absente : "Information actuellement indisponible."

RÉSERVATION :
Avant toute confirmation demande : Nom, Téléphone, Dates, Nombre de voyageurs.

COLLECTE CLIENT :
Collecte : Nom, Téléphone, Email, Ville.
Avant marketing, demande l'autorisation : "Acceptez-vous de recevoir nos promotions et offres Easy2Book ?"
Si accepté : consent_marketing = true. Sinon : consent_marketing = false.

IMPORTANT :
* Utiliser uniquement la base Easy2Book.
* Ne jamais inventer une disponibilité réelle.
* Ne jamais inventer un prix réel.
* Ne jamais confirmer automatiquement une réservation.
* Demander consentement avant marketing.

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
