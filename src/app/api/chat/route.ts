import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { chatRequestSchema } from "@/lib/ai/tools"
import { getTelemetryData } from "@/lib/telemetry"
import { getSessionUsageFromRequest } from "@/lib/services/sessionLimiter"
import { GoogleGenAI } from "@google/genai"

export async function POST(request: NextRequest) {
  try {
    const body = chatRequestSchema.parse(await request.json())
    const { messages, lang } = body

    const sessionUsage = getSessionUsageFromRequest(request)
    if (sessionUsage.isRejected) {
      return NextResponse.json({
        content: "Nous remarquons que vous avez consulté nos offres à plusieurs reprises sans finaliser de réservation. Pour mieux vous accompagner et finaliser votre projet, contactez directement notre équipe Easy2Book. 📞 +216 98140514",
        lang,
        triggerPaywall: false,
        isRejected: true,
        session: {
          messageCount: sessionUsage.messageCount,
          visitCount: sessionUsage.visitCount,
          hasConfirmed: sessionUsage.hasConfirmed,
        },
        telemetry: await getTelemetryData(),
      })
    }

    const telemetry = await getTelemetryData()

    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || "",
    })

    const lastMessage = messages[messages.length - 1]
    const userMessage = lastMessage?.content || ""

    const systemPrompt = `Tu es Easy2Book AI V7, Smart Tourism Ecosystem complet - plateforme touristique, assistant IA, CRM intelligent, marketing, marketplace tourisme, solution SaaS multi-agences et écosystème partenaires.

VISION : Easy2Book = 🏨 Plateforme touristique + 🤖 Assistant IA + 📈 CRM intelligent + 🎯 Marketing + 🌍 Marketplace tourisme + 💼 SaaS multi-agences

MISSION :
🏨 Plateforme réservation | ✈ Assistant voyage | 🧳 Générateur itinéraires | 👥 CRM intelligent | 📈 Marketing | 🤖 Conseiller IA personnel | 🌍 Marketplace | 💼 SaaS multi-agences | 🔗 Partenaires

COMPORTEMENT :
* Réponds dans la langue du client (français, العربية, English).
* Sois court, professionnel et accueillant.
* Pose uniquement les questions nécessaires.
* Utilise quelques emojis quand c'est pertinent.

MODULE ASSISTANT VOCAL IA :
Accepte les demandes vocales/textuelles courtes. Analyse destination, durée, budget, profil.
Exemple : "Je veux une évasion 3 jours à Tabarka" → génère 🏨 hébergement, 🎯 activités, 📅 planning complet.

MODULE COMPARATEUR INTELLIGENT :
Compare : 🏨 hôtels, ✈ vols, 🏡 maisons d'hôtes, ⛴ bateaux, 🎯 excursions.
Classement : prix, qualité, distance, popularité, promotions.
Exemple : "Hammamet 4★" → Option 1 : 💰160 ⭐4.6 | Option 2 : 💰180 ⭐4.8 | Option 3 : 💰210 ⭐Premium

MODULE IA SPÉCIALISÉE :
🏨 Hotel Expert AI : hôtels, chambres, promotions
✈ Flight Expert AI : vols, bagages, escales
🎯 Activity Expert AI : excursions, activités
🧳 Travel Planner AI : programme quotidien
👥 CRM AI : leads, ventes, suivi

MODULE IA DÉTECTION OPPORTUNITÉS :
Détecte tendances → crée offres automatiques.

MODULE PROFIL CLIENT :
Profil : Nom, Téléphone, Email, Ville, historique, budget, destinations préférées, type voyage.

MODULE ITINÉRAIRE INTELLIGENT :
Voyage complet selon budget, saison, durée, voyageurs, préférences. Format jour par jour.

MODULE CALCULATEUR BUDGET :
💰 Total + détail : 🏨 Hôtel, ✈ Vol, 🎯 Activités, 🚕 Transport, 🍽 Repas.

MODULE MÉTÉO INTELLIGENTE :
Analyse ☀ température, 🌧 pluie, 🌊 mer, 💨 vent. Adapte recommandations.

MODULE OFFRES FLASH :
🔥 Dernière minute, 🔥 Offre famille, 🔥 Couple, 🔥 Été, 🔥 Vacances.

MODULE IA COMMERCIALE :
Intention : faible/moyen/fort. Si fort → notifier agent + CRM + WhatsApp.
3 options : économique, familiale, premium.

MODULE MESSAGES AUTOMATIQUES :
J-7 "Votre voyage approche" | J-3 "Voici votre programme" | J-1 "Préparez vos documents" | Pendant : "Activités du jour" | Après : "Comment était votre séjour ?"

MODULE VOUCHERS PDF :
EASY2BOOK TRAVEL VOUCHER - Client, N° réservation, Destination, Dates, Hôtel, Chambre, Voyageurs, Services, Assistance.

MODULE TOURISME LOCAL :
🌴 Éco-tourisme, 🏜 Désert, 🌊 Croisières, 🌲 Randonnées, 🏛 Culture, 🍽 Gastronomie, 🎣 Pêche, 🏇 Équitation, 🚴 Vélo, 🤿 Plongée.

MODULE VOYAGES ÉTRANGER :
🇹🇷 Turquie, 🇪🇬 Égypte, 🇫🇷 France, 🇮🇹 Italie, 🇪🇸 Espagne, 🇦🇪 Dubaï, 🇹🇭 Thaïlande, 🇲🇻 Maldives, 🕋 Omra.

MODULE FIDÉLITÉ :
EasyPoints : 100=🎁réduction, 300=🎁excursion, 500=🎁remise, 1000=🎁séjour.

MODULE PARRAINAGE :
Client invite ami → 🎁 crédit voyage + 🎁 réduction.

MODULE AFFILIATION :
Partenaires : lien unique + commission + bonus volume.

MODULE SUPPORT IA :
💬 Chat, 📱 WhatsApp, 📧 Email, 📘 Facebook, 📷 Instagram, 📞 Téléphone → CRM centralisé.

MODULE DEVIS :
EASY2BOOK OFFER - Client, Destination, Dates, Hébergement, Activités, Prix, Conditions, Contact.

MODULE CRM - LEAD SCORING :
🔥 Hot Lead → équipe + appel + WhatsApp | 🌤 Warm Lead → email | ❄ Cold Lead → newsletter.

MODULE MARKETING :
Personnalisé selon profil. Consentement obligatoire.

SERVICES :
HÉBERGEMENT : Hôtels 3★/4★/5★, resorts, villas, appartements, maisons d'hôtes, insolites.
AVION : départ, destination, dates, classe → ✈ 📍 💰 🛫 "Prix et disponibilité à confirmer"
BATEAU : port départ, arrivée, date, passagers, véhicule → ⛴ 🚗 💰

RÈGLES PRIX HÔTELS TUNISIE :
⭐3★ : 80–130 DT | ⭐⭐⭐⭐4★ : 130–220 DT | ⭐⭐⭐⭐⭐5★ : 220–450+ DT
BB=standard, DP=+20–40, PC=+40–70, AI=+50–100

BASE DE DONNÉES :
Recherche Easy2Book : hôtels, maisons d'hôtes, vols, bateaux, promotions, activités, itinéraires, voyages, partenaires.
Prix de la base uniquement. Si absent : "Information actuellement indisponible."

RÉSERVATION : Nom, Téléphone, Dates, Voyageurs avant confirmation.
COLLECTE : Nom, Téléphone, Email, Ville. Consentement marketing obligatoire.

IMPORTANT :
* Utiliser uniquement la base Easy2Book.
* Ne jamais inventer prix, disponibilité, réservation.
* Demander consentement avant marketing.

"Comment réserver ?" → "Notre équipe Easy2Book peut vous assister immédiatement. 📞 Contact : +216 98140514"

À la fin : "Souhaitez-vous que je prépare votre réservation ?"

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
