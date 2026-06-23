import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { calculateDisplayPrice } from "@/lib/pricing"
import { checkAvailability } from "@/db/inventory"
import {
  detectVisaFreeIntent,
  getQuickEscapeDestinations,
  formatVisaLabel,
} from "@/lib/services/destinationFilters"
import { parseFamilyStructure, allocateRooms, containsFamilyStructure } from "@/utils/familyParser"
import { findPackagesWithinBudget } from "@/utils/budgetMatcher"
import { isPassMember } from "@/lib/services/loyaltyService"
import { findGuidesByZone } from "@/lib/services/guidesService"
import {
  detectLowBudgetIntent,
  generateLowBudgetItinerary,
  getHeritageBudgetActivities,
} from "@/utils/lowBudgetOptimizer"
import { getSessionUsage, incrementSessionUsage } from "@/lib/services/sessionLimiter"
import { db } from "@/db"
import { packageInventory, aiMarketTrends, clientTrips } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"

/**
 * POST /api/chat/orchestrator
 *
 * Orchestrateur central IA d'Easy2Book.
 * - Adopte la posture d'un Concepteur d'Expériences de voyage anti-agence de masse.
 * - Détecte la langue, la catégorie, la destination et le mode Explorateur.
 * - Injecte prix réels (marges dynamiques) et disponibilité de stocks.
 * - Retourne un JSON structuré avec message, itinéraire jour par jour et flags UI.
 */

const requestSchema = z.object({
  message: z.string().min(1),
  lang: z.enum(["fr", "en", "ar"]).optional().default("fr"),
  sessionId: z.string().min(1).optional().default("anonymous"),
  userPhone: z.string().optional(),
  tripType: z.enum(["mice", "medical", "event", "leisure"]).optional().default("leisure"),
  groupSize: z.number().int().min(1).optional().default(1),
  previousMessages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
})

export type SupportedLanguage = "fr" | "en" | "ar"

export type TravelCategory = "omra" | "voyage" | "hotel" | "generic" | "explorer"

interface TravelIntent {
  category: TravelCategory
  destination: string | null
  language: SupportedLanguage
  explorerMode: boolean
  durationDays: number | null
  visaFree: boolean
  lowBudget: boolean
  family: {
    adults: number
    children: number
    ages: number[]
  } | null
}

interface ItineraryDay {
  day: number
  morning: string
  midday: string
  afternoon: string
  evening: string
  estimatedCost: string | null
}

interface ItineraryPlan {
  title: string
  subtitle: string
  days: ItineraryDay[]
  totalEstimatedCost: string
  valueForMoneyScore: number
}

interface OrchestratorResponse {
  message: string
  itinerary: ItineraryPlan | null
  suggestedPackage: string | null
  clientTripId: string | null
  family: {
    adults: number
    children: number
    ages: number[]
    rooms: Array<{
      type: string
      capacity: number
      count: number
      label: string
    }>
  } | null
  budgetMatches: Array<{
    id: string
    type: string
    name: string
    destination: string
    finalPrice: number
    savings: number
    details: string
  }> | null
  lowBudget: {
    active: boolean
    accommodations: string[]
    freeActivities: string[]
    paidActivities: string[]
    tips: string[]
  }
  session: {
    messageCount: number
    maxFreeMessages: number
    remaining: number
    triggerPaywall: boolean
  }
  flags: {
    showBookingForm: boolean
    showUrgency: boolean
    isSoldOut: boolean
    currentPrice: number
    currency: string
    remainingSlots: number
    category: TravelCategory
    destination: string | null
    explorerMode: boolean
    visaFree: boolean
    lowBudget: boolean
    triggerPaywall: boolean
    showLeadForm: boolean
  }
}

async function getGemini() {
  const { GoogleGenerativeAI } = await import("@google/generative-ai")
  return new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "")
}

// ============================================================================
// BASE DE CONNAISSANCES TOURISME ALTERNATIF
// ============================================================================

const ALTERNATIVE_TN_SPOTS = [
  {
    name: "Beni Mtir",
    vibe: "Glamping éco-sélectif et cascades",
    activities: ["randonnée des cascades", "bivouac éco-lodge", "observation de la faune sauvage"],
  },
  {
    name: "Zriba El Alia",
    vibe: "Village berbère perché et troglodyte",
    activities: ["visite du village abandonné", "dégustation de miel local", "randonnée dans les Djebel Zaghouan"],
  },
  {
    name: "Toujane",
    vibe: "Immersion troglodyte de charme",
    activities: ["séjour chez l'habitant", "cuisine traditionnelle berbère", "vue panoramique sur les ksour"],
  },
  {
    name: "Matmata",
    vibe: "Hôtels de cavernes authentiques",
    activities: ["visite d'habitats troglodytiques", "thé à la menthe chez l'habitant", "coucher de soleil désertique"],
  },
  {
    name: "Cap Serrat",
    vibe: "Retraite de nature sauvage",
    activities: ["baignade dans des criques isolées", "randonnée côtière", "pique-nique de fruits de mer locaux"],
  },
  {
    name: "Haouaria",
    vibe: "Plages vierges et fauconnerie",
    activities: ["plage de Sidi Youssef", "observation de rapaces", "dégustation de pain traditionnel au four communal"],
  },
  {
    name: "Ghar El Melh",
    vibe: "Kayak et criques cachées",
    activities: ["kayak de mer dans les criques", "visite de la lagune de Bizerte", "dîner de poisson grillé"],
  },
]

const ALTERNATIVE_WORLD_SPOTS = [
  {
    name: "Albanie",
    country: "Riviera Balte / Ksamil",
    valueForMoney: 10,
    why: "Plages turquoise, prix bas, visa facile pour les tunisiens",
    highlights: ["plages de Ksamil", "Bunk'Art 1 à Tirana", "villages de pêcheurs de Dhermi"],
  },
  {
    name: "Turquie",
    country: "Cappadoce & Voie Lycienne",
    valueForMoney: 9,
    why: "Vol direct Tunis-Istanbul, faible coût de vie, paysages mythiques",
    highlights: ["vol montgolfière Cappadoce", "randonnée Voie Lycienne", "villages troglodytes de Göreme"],
  },
  {
    name: "Géorgie",
    country: "Montagnes et culture",
    valueForMoney: 9,
    why: "Visa électronique, gastronomie unique, montagnes du Caucase",
    highlights: ["Tbilisi old town", "Kazbegi Stepantsminda", "route militaire géorgienne"],
  },
  {
    name: "Indonésie",
    country: "Sumba",
    valueForMoney: 8,
    why: "Bali authentique, surf, traditions Marapu, hors des circuits",
    highlights: ["villages traditionnels de Sumba", "plages de Marosi", "cascades de Lapopu"],
  },
]

// ============================================================================
// BASE DE CONNAISSANCES "RICHESSES DE LA TUNISIE"
// ============================================================================

const TUNISIAN_HERITAGE = {
  ruins: {
    title: "Ruines & Archéologie",
    items: [
      { name: "Dougga", note: "Site romain UNESCO, guide officiel recommandé" },
      { name: "Sbeïtla", note: "Triade de temples romains dans un cadre naturel" },
      { name: "Bulla Regia", note: "Villas romaines souterraines uniques" },
      { name: "Makthar", note: "Site moins fréquenté, très abordable" },
      { name: "El Jem", note: "Troisième plus grand amphithéâtre romain, incontournable" },
      { name: "Utique", note: "Ruines phénico-puniques au bord de la mer" },
      { name: "Carthage", note: "Patrimoine mondial, à visiter avec un guide certifié" },
    ],
  },
  terroir: {
    title: "Produits du Terroir & Maisons d'Hôtes",
    items: [
      { name: "Miel de Beni Mtir", note: "Miel de montagne, dégustation chez producteur" },
      { name: "Huile d'olive de Mornag", note: "Domaines familiaux avec table d'hôte" },
      { name: "Huile d'olive de Sfax", note: "Visites de moulin et dégustation" },
      { name: "Harissa de Nabeul", note: "Artisanale et familiale" },
      { name: "Figues de Djebba", note: "Séchées et fraîches, achat direct" },
      { name: "Fromages artisanaux de Béja", note: "Fermes locales avec accueil" },
    ],
  },
  fauna: {
    title: "Faune & Flore",
    items: [
      { name: "Flamants roses", note: "Lac de Tunis et Djerba, observation gratuite" },
      { name: "Parc National de l'Ichkeul", note: "Buffles, oiseaux migrateurs, UNESCO" },
      { name: "Parc de Bouhedma", note: "Gazelles et paysages sahéliens" },
      { name: "Ain Draham", note: "Forêts de chênes-lièges, randonnées balisées" },
    ],
  },
  festivals: {
    title: "Festivals & Cérémonies",
    items: [
      { name: "Symphonies d'El Jem", note: "Concerts classiques dans l'amphithéâtre" },
      { name: "Jazz de Tabarka", note: "Festival international en bord de mer" },
      { name: "Festival du Sahara à Douz", note: "Traditions sahariennes, musique, méharées" },
      { name: "Fêtes des agrumes à Nabeul", note: "Parfums, couleurs et animations" },
    ],
  },
  aquaparks: {
    title: "Divertissement & Parcs Aquatiques",
    items: [
      { name: "Nahrawess", note: "Parc aquatique à proximité de Tunis, tarifs famille" },
      { name: "Safa Aquapark", note: "Toboggan et piscines pour familles" },
    ],
  },
}

// ============================================================================
// DÉTECTION D'INTENTION
// ============================================================================

function detectLanguage(text: string, preferredLang: SupportedLanguage): SupportedLanguage {
  const arabicRegex = /[\u0600-\u06FF]/
  if (arabicRegex.test(text)) return "ar"
  return preferredLang
}

function detectExplorerMode(text: string): boolean {
  const lower = text.toLowerCase()
  const explorerSignals = [
    "original",
    "insolite",
    "aventure",
    "nature",
    "authentic",
    "authentique",
    "loupé",
    "secret",
    "hors des sentiers",
    "off the beaten",
    "randonnée",
    "trek",
    "glamping",
    "éco-lodge",
    "insolite",
    "déconnexion",
    "slow travel",
    "aventure",
    "alternative",
    "créateurs",
    "local",
  ]
  return explorerSignals.some((signal) => lower.includes(signal))
}

function detectDurationDays(text: string): number | null {
  const patterns = [
    { regex: /(\d+)\s*jours?/, default: 1 },
    { regex: /(\d+)\s*jr/, default: 1 },
    { regex: /une?\s+semaine/, default: 7 },
    { regex: /week-?end/, default: 2 },
    { regex: /weekend/, default: 2 },
  ]

  for (const pattern of patterns) {
    const match = pattern.regex.exec(text.toLowerCase())
    if (match) {
      if (pattern.default === 1) {
        return parseInt(match[1], 10)
      }
      return pattern.default
    }
  }

  return null
}

function detectDestination(text: string): { destination: string | null; category: TravelCategory } {
  const lower = text.toLowerCase()

  // Omra
  if (/\b(omra|oumra|umrah|عمرة|hajj|حج)\b/.test(lower)) {
    return { destination: null, category: "omra" }
  }

  // Hôtels Tunisie
  const hotelDestinations = ["hammamet", "sousse", "djerba", "tabarka", "tunis", "monastir", "mahdia", "tozeur", "ksar ghilane"]
  const hotelMatch = hotelDestinations.find((d) => lower.includes(d))
  if (/\b(hotel|hôtel|فندق|loger|séjourner|nuit|chambre|nuitée)\b/.test(lower)) {
    if (hotelMatch) {
      return { destination: hotelMatch.charAt(0).toUpperCase() + hotelMatch.slice(1), category: "hotel" }
    }
    return { destination: null, category: "hotel" }
  }

  // Destinations internationales
  const internationalDestinations = [
    { name: "Istanbul", aliases: ["istanbul", "istambul", "استنبول"] },
    { name: "Cap-Vert", aliases: ["cap-vert", "cap vert", "capverde", "كاب فيردي", "sal", "santa maria"] },
    { name: "Turquie", aliases: ["turquie", "turkey", "turkish", "تركيا", "cappadoce", "cappadocia", "voie lycienne", "lycian way"] },
    { name: "Albanie", aliases: ["albanie", "albania", "ksamil", "dhermi", "tirana", "riviera balte"] },
    { name: "Géorgie", aliases: ["géorgie", "georgia", "tbilisi", "kazbegi", "caucase"] },
    { name: "Sumba", aliases: ["sumba", "indonésie", "indonesia", "bali authentique", "marosi"] },
    { name: "Maroc", aliases: ["maroc", "morocco", "marrakech", "chefchaouen"] },
  ]

  for (const dest of internationalDestinations) {
    if (dest.aliases.some((alias) => lower.includes(alias))) {
      return { destination: dest.name, category: "voyage" }
    }
  }

  // Destinations alternatives tunisiennes
  const alternativeTn = [
    { name: "Beni Mtir", aliases: ["beni mtir", "bni mtir", "béni mtir"] },
    { name: "Zriba El Alia", aliases: ["zriba", "zriba el alia"] },
    { name: "Toujane", aliases: ["toujane", "toujène"] },
    { name: "Matmata", aliases: ["matmata", "matmatah"] },
    { name: "Cap Serrat", aliases: ["cap serrat", "ras serrat"] },
    { name: "Haouaria", aliases: ["haouaria", "el haouaria"] },
    { name: "Ghar El Melh", aliases: ["ghar el melh", "ghar el meleh", "porto farina"] },
  ]

  for (const dest of alternativeTn) {
    if (dest.aliases.some((alias) => lower.includes(alias))) {
      return { destination: dest.name, category: "explorer" }
    }
  }

  // Tunisie générale (éviter Djerba/Hammamet si mode explorateur)
  if (/\b(tunisie|tunisia|tunisien|تونس|tunis)\b/.test(lower)) {
    return { destination: "Tunisie", category: "explorer" }
  }

  return { destination: null, category: "generic" }
}

function detectBudget(text: string): number | null {
  const match = /(\d{3,})\s*(tnd|dt|dinars?|€|\$|eur)/i.exec(text)
  if (match) return parseInt(match[1], 10)
  return null
}

function detectTripType(text: string): "mice" | "medical" | "event" | "leisure" {
  const lower = text.toLowerCase()
  if (/\b(seminaire|conference|mice|team building|corporate|entreprise|business|salon|colloque)\b/.test(lower)) {
    return "mice"
  }
  if (/\b(chirurgie|operation|medical|dentaire|esthetique|tha|thalasso|traitement|hopital|clinique|convalescence)\b/.test(lower)) {
    return "medical"
  }
  if (/\b(mariage|wedding|anniversaire|event|evenement|gala|fete)\b/.test(lower)) {
    return "event"
  }
  return "leisure"
}

function detectGroupSize(text: string): number {
  const match = /(\d{1,4})\s*(personnes?|participants?|invités?|voyageurs?|attendees?)/i.exec(text)
  if (match) return Math.min(parseInt(match[1], 10), 500)
  return 1
}

function detectIntent(text: string, preferredLang: SupportedLanguage): TravelIntent {
  const language = detectLanguage(text, preferredLang)
  const { destination, category } = detectDestination(text)
  const explorerMode = detectExplorerMode(text)
  const durationDays = detectDurationDays(text)
  const visaFree = detectVisaFreeIntent(text)
  const lowBudget = detectLowBudgetIntent(text)

  const familyStructure = containsFamilyStructure(text) ? parseFamilyStructure(text) : null
  const family = familyStructure
    ? {
        adults: familyStructure.adults,
        children: familyStructure.children.length,
        ages: familyStructure.children.map((c) => c.age),
      }
    : null

  // Si mode explorateur détecté mais catégorie générique, on bascule vers explorer
  const finalCategory: TravelCategory =
    explorerMode && category === "generic" ? "explorer" : category

  return {
    category: finalCategory,
    destination,
    language,
    explorerMode,
    durationDays,
    visaFree,
    lowBudget,
    family,
  }
}

// ============================================================================
// INJECTION DE DONNÉES RÉELLES
// ============================================================================

async function findInventoryPackage(
  category: string,
  destination: string | null
): Promise<string | null> {
  const conditions = [eq(packageInventory.category, category)]

  if (destination) {
    conditions.push(sql`${packageInventory.destination} ILIKE ${`%${destination}%`}`)
  }

  const rows = await db
    .select({ id: packageInventory.id })
    .from(packageInventory)
    .where(and(...conditions))
    .limit(1)

  return rows[0]?.id || null
}

async function fetchLocalGuides(destination: string | null): Promise<
  Array<{
    name: string
    activity: string
    pricePerPerson: number
    duration: string
    maxGroupSize: number
    languages: string[]
    description: string
  }>
> {
  if (!destination) return []
  return findGuidesByZone(destination)
}

function estimateRawPrice(category: TravelCategory, destination: string | null): number {
  if (category === "hotel") return 320
  if (category === "omra") return 4200
  if (destination === "Istanbul" || destination === "Turquie") return 1890
  if (destination === "Cap-Vert") return 2450
  if (destination === "Albanie") return 2200
  if (destination === "Géorgie") return 2600
  if (destination === "Sumba") return 3900
  return 1890
}

// ============================================================================
// PROMPT SYSTÈME
// ============================================================================

function buildSystemPrompt(
  lang: SupportedLanguage,
  price: number,
  availability: {
    available: boolean
    triggerUrgence: boolean
    remaining: number
    isSoldOut: boolean
    notFound: boolean
  },
  intent: TravelIntent,
  context: string
): string {
  const basePrice = `${price.toFixed(2)} TND`
  const urgency = availability.notFound
    ? `📦 STOCK NON RÉFÉRENCÉ : ce package n'a pas encore de suivi de places. Présente le prix indicatif et oriente vers WhatsApp pour vérifier la disponibilité.`
    : availability.triggerUrgence
    ? `⚠️ URGENCE STOCK : il ne reste plus que ${availability.remaining} place(s) disponible(s). Insiste légèrement pour que l'utilisateur réserve rapidement.`
    : availability.isSoldOut
    ? `❌ STOCK ÉPUISÉ : ce package est complet. Propose à l'utilisateur de s'inscrire sur liste d'attente ou d'explorer une alternative.`
    : availability.remaining > 0
    ? `✅ STOCK : ${availability.remaining} places restantes.`
    : ""

  const priceLine = `Prix indicatif affiché : **${basePrice}** (hors vols internationaux selon cas). Précise toujours que le devis final est envoyé sur WhatsApp.`

  const antiAgency = `
## POSTURE : Ambassadeur Passionné du Patrimoine Tunisien

Tu n'es PAS une agence de voyage classique. Tu es un ambassadeur passionné du patrimoine, de la nature et du terroir tunisien, connecté aux tendances 2026. Règles absolues :
- **Zéro circuits de groupe de 50 personnes** au pas de course.
- **Zéro catalogue hôtelier standard**. Tu proposes des pépites, des éco-lodges, des maisons d'hôtes, des tables d'hôtes, des spots insolites.
- **Smart Price** : tu maximises le pouvoir d'achat du voyageur tunisien. Évite les pièges à touristes, privilégie le value-for-money.
- **Miroir linguistique** : français haut de gamme, chaleureux et inspirant. Si l'utilisateur utilise la Derja tunisienne, intègre naturellement des tournures familières tunisiennes sans casser le niveau de service premium.
- **Ambassadeur du patrimoine** : ne propose pas mécaniquement "Hôtel à Hammamet". Construis des expériences : *"Je vous propose de séjourner dans une magnifique maison d'hôte près de Dougga. Le matin, vous visitez les ruines romaines sublimes loin des bus de touristes, et le midi, vous dégustez un couscous au mérou traditionnel préparé avec l'huile d'olive de leur propre domaine..."*
- **Ne promets jamais un prix final fixe** : toujours "À partir de" ou "Estimation indicative".
`

  const alternativeKb = `
## CATALOGUE ALTERNATIF (à utiliser si l'utilisateur cherche authenticité, nature, déconnexion)

### Tunisie insolite & éco-sélectif
${ALTERNATIVE_TN_SPOTS.map((s) => `- **${s.name}** : ${s.vibe}. ${s.activities.join(" / ")}.`).join("\n")}

### International value-for-money (visas simplifiés / prix bas pour budget tunisien)
${ALTERNATIVE_WORLD_SPOTS.map((s) => `- **${s.name} (${s.country})** : score VFM ${s.valueForMoney}/10. ${s.why}. ${s.highlights.join(" / ")}.`).join("\n")}

### Anti-Catalogue
Si l'utilisateur demande "Où aller en Tunisie cet automne ?", NE réponds pas "Djerba ou Hammamet". Propose plutôt :
- Week-end déconnexion en éco-lodge à Beni Mtir avec randonnée des cascades.
- Immersion troglodyte de charme chez l'habitant à Toujane ou Matmata.
- Retraite de nature au Cap Serrat ou à Haouaria.
- Kayak dans les criques cachées de Ghar El Melh.

## RICHESSES DE LA TUNISIE (à proposer spontanément quand c'est pertinent)

### Ruines & Archéologie
${TUNISIAN_HERITAGE.ruins.items.map((i) => `- **${i.name}** : ${i.note}.`).join("\n")}

### Terroir & Maisons d'Hôtes
${TUNISIAN_HERITAGE.terroir.items.map((i) => `- **${i.name}** : ${i.note}.`).join("\n")}

### Faune & Flore
${TUNISIAN_HERITAGE.fauna.items.map((i) => `- **${i.name}** : ${i.note}.`).join("\n")}

### Festivals & Cérémonies
${TUNISIAN_HERITAGE.festivals.items.map((i) => `- **${i.name}** : ${i.note}.`).join("\n")}

### Divertissement & Parcs Aquatiques
${TUNISIAN_HERITAGE.aquaparks.items.map((i) => `- **${i.name}** : ${i.note}.`).join("\n")}
`

  const lowBudgetPlan = intent.lowBudget
    ? `
## MODE BUDGET RÉDUIT ACTIVÉ
${generateLowBudgetItinerary(intent.destination).accommodations.map((a) => `- Hébergement : ${a}`).join("\n")}
Activités gratuites : ${generateLowBudgetItinerary(intent.destination).freeActivities.join(" ; ")}.
Activités abordables : ${generateLowBudgetItinerary(intent.destination).paidActivities.join(" ; ")}.
Conseils : minimise les hôtels internationaux, privilégie les maisons d'hôte, les gîtes ruraux et les activités de plein air.
`
    : ""

  const miceMedicalRules = `
## INBOUND & MICE / MEDICAL TOURISM

### MICE (Corporate & Events)
- Planifie des plannings d'engagement rigides heure par heure.
- Propose des salles de réunion, pauses café, transferts collectifs par bus privés, soirées de gala.
- Mentionne toujours les volumes d'invités et les tarifs dégressifs de groupe (10-20 personnes : -5%, 20-50 : -10%, 50+ : -15%).
- Adopte un ton professionnel, exécutif et rassurant.

### Médical Tourism
- Adopte un ton rassurant, professionnel et confidentiel.
- Intègre des temps de repos post-opératoire obligatoires et des séjours de convalescence dans des hôtels partenaires spécialisés en thalassothérapie.
- Ne donne jamais d'avis médical : oriente vers les cliniques partenaires et rappelle que le dossier est confidentiel.
- Privilégie les hébergements calmes, proches des établissements de soins, avec accès thalasso.

### Group Pricing
- Si le groupe fait plus de 10 personnes, applique automatiquement une réduction de groupe dans le prix affiché.
- Pour les MICE, proposer des packages clés en main : airport-to-airport, hôtel, salles, restauration, excursions.
`

  const dayByDayRules = `
## ALGORITHME JOUR PAR JOUR (strict)
Dès qu'une demande d'itinéraire est détectée, tu DOIS structurer la réponse en 4 moments par jour :
1. **Matin** : activité principale (culturelle, nature ou visuelle) optimisée pour éviter la foule.
2. **Midi** : street-food locale, table d'hôte authentique ou café-concept indépendant.
3. **Après-midi** : exploration à pied, immersion, shopping de créateurs locaux ou micro-aventure.
4. **Soir** : expérience nocturne marquante (rooftop secret, coucher de soleil panoramique, spot insolite).

## RÈGLE DE MONÉTISATION : PAYWALL SÉMANTIQUE
Si l'utilisateur demande un plan de voyage complet, tu DOIS générer de manière visible et détaillée uniquement le **Jour 1 et le Jour 2**.
À partir du **Jour 3**, tronque la réponse et injecte EXACTEMENT ce texte de conversion dans le champ "morning" de chaque jour :
"[🔒 CONTENU PREMIUM VERROUILLÉ] Pour débloquer la suite de votre itinéraire exclusif jour par jour, obtenir les coordonnées de la maison d'hôte, du guide local, et bloquer votre tarif préférentiel en TND, veuillez finaliser votre demande ci-dessous pour recevoir votre lien de paiement d'acompte."

Les autres champs des jours 3+ (midday, afternoon, evening) doivent être vides ou null.
L'API retournera en parallèle le drapeau structuré showLeadForm: true.
`

  const outputFormat = `
## FORMAT DE SORTIE (JSON obligatoire)
Tu dois répondre en JSON strictement valide avec cette structure :
{
  "message": "<texte de présentation chaleureux et premium, avec prix et urgence si applicable>",
  "itinerary": {
    "title": "<titre accrocheur du séjour>",
    "subtitle": "<sous-titre accrocheur>",
    "days": [
      {
        "day": 1,
        "morning": "<activité matin>",
        "midday": "<recommandation midi>",
        "afternoon": "<activité après-midi>",
        "evening": "<expérience soir>"
      }
    ],
    "totalEstimatedCost": "<estimation en TND>",
    "valueForMoneyScore": <score 1-10>
  },
  "suggestedPackage": "<slug du package recommandé : istanbul_trendy, omra_prestige, tunisia_explorer, albania_vfm, etc. ou null>",
  "metadata": {
    "destination": "<destination principale détectée ou null>",
    "category": "<omra | voyage_organise | alternative | hotel | generic>",
    "budget": "<economique | luxe | flexible | null>",
    "keywords": ["<mot-clé 1>", "<mot-clé 2>"],
    "requestedDates": "<plage de dates demandée au format JJ/MM/AAAA - JJ/MM/AAAA ou null>"
  }
}

La propriété "message" doit être un texte fluide en français premium (ou Derja si approprié). Les clés de l'itinéraire sont en anglais pour le frontend. Ne mets pas de markdown à l'intérieur du JSON.
`

  const visaLine = intent.destination
    ? `Statut visa pour passeport tunisien : ${formatVisaLabel(intent.destination)}.`
    : ""
  const visaFreeLine = intent.visaFree
    ? `Mode "Évasion sans visa" activé. Privilégie impérativement les destinations sans visa ou visa à l'arrivée : ${getQuickEscapeDestinations()
        .map((d) => d.destination)
        .join(", ")}.`
    : ""
  const familyLine = intent.family
    ? `Structure familiale : ${intent.family.adults} adulte(s), ${intent.family.children} enfant(s).`
    : ""

  return `${antiAgency}
${alternativeKb}
${lowBudgetPlan}
${miceMedicalRules}
${dayByDayRules}
${outputFormat}

## CONTEXTE COURANT
Catégorie détectée : ${intent.category}. Destination : ${intent.destination || "non précisée"}. Mode Explorateur : ${intent.explorerMode ? "activé" : "désactivé"}. Langue : ${lang}. ${context}

${visaLine}
${visaFreeLine}
${familyLine}
${priceLine}
${urgency}
`
}

// ============================================================================
// ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = requestSchema.parse(await request.json())
    const { message, lang, sessionId, userPhone, tripType: requestedTripType, groupSize: requestedGroupSize, previousMessages } = body

    // Vérification du quota de messages gratuits
    const sessionUsage = await getSessionUsage()
    if (sessionUsage.triggerPaywall) {
      return NextResponse.json({
        message: "Vous avez atteint votre limite de messages gratuits. Débloquez l'accès complet à Easy2Book pour continuer.",
        itinerary: null,
        suggestedPackage: null,
        clientTripId: null,
        family: null,
        budgetMatches: null,
        lowBudget: { active: false, accommodations: [], freeActivities: [], paidActivities: [], tips: [] },
        session: {
          messageCount: sessionUsage.messageCount,
          maxFreeMessages: sessionUsage.maxFreeMessages,
          remaining: 0,
          triggerPaywall: true,
        },
        flags: {
          showBookingForm: false,
          showUrgency: false,
          isSoldOut: false,
          currentPrice: 0,
          currency: "TND",
          remainingSlots: 0,
          category: "generic",
          destination: null,
          explorerMode: false,
          visaFree: false,
          lowBudget: false,
          triggerPaywall: true,
          showLeadForm: true,
        },
      })
    }

    await incrementSessionUsage()

    const intent = detectIntent(message, lang)
    const { category, destination, explorerMode, durationDays } = intent

    // Type de voyage (MICE, Médical, Événement, Loisir) et taille du groupe
    const tripType = requestedTripType || detectTripType(message)
    const groupSize = requestedGroupSize || detectGroupSize(message)

    // Membre Pass : bypass des marges sur hôtels locaux et tourisme alternatif
    const passMember = userPhone ? await isPassMember(userPhone) : false

    // Prix réel après marges dynamiques et tarifs de groupe
    const rawPrice = estimateRawPrice(category, destination)
    const serviceType: "hotel" | "flight" | "trip" = category === "hotel" ? "hotel" : "trip"
    const pricingCategory = category === "generic" ? "generic" : category
    const groupDiscountMultiplier = groupSize >= 50 ? 0.85 : groupSize >= 20 ? 0.9 : groupSize >= 10 ? 0.95 : 1

    const enginePrice = await calculateDisplayPrice(
      serviceType,
      rawPrice,
      destination,
      pricingCategory,
      passMember
    )
    const finalPrice = Math.round(enginePrice * groupDiscountMultiplier * 100) / 100

    // Disponibilité des stocks
    const packageId = await findInventoryPackage(category, destination)
    const availability = packageId
      ? await checkAvailability(packageId)
      : {
          available: true,
          triggerUrgence: false,
          remaining: 0,
          total: 0,
          isSoldOut: false,
          notFound: true,
        }

    // Récupération des guides locaux pour enrichir la proposition
    const localGuides = await fetchLocalGuides(destination)

    // Contexte additionnel
    const context = `
Nombre de jours demandé : ${durationDays || "non précisé"}.
Type de voyage : ${tripType}. Taille du groupe : ${groupSize} personne(s).
Historique : ${previousMessages.length > 0 ? " conversation en cours" : " première interaction"}.
Guides locaux disponibles : ${
      localGuides.length > 0
        ? localGuides.map((g) => `${g.activity} (${g.duration}, ${g.pricePerPerson} TND/personne, ${g.maxGroupSize} max)`).join(" ; ")
        : "aucun"
    }.
${passMember ? "Client membre PASS : bypass des marges sur hôtels locaux et tourisme alternatif." : ""}
`

    // Appel Gemini
    const genAI = await getGemini()
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const systemPrompt = buildSystemPrompt(
      intent.language,
      finalPrice,
      availability,
      intent,
      context
    )

    // Convertir le format OpenAI vers Gemini
    const history = previousMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({
      history,
      systemInstruction: systemPrompt,
    })

    const result = await chat.sendMessage(message)
    const response = await result.response
    const rawContent = response.text().trim()
    const clientTripId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    let parsed: OrchestratorResponse = {
      message: "",
      itinerary: null,
      suggestedPackage: null,
      clientTripId: null,
      family: null,
      budgetMatches: null,
      lowBudget: {
        active: intent.lowBudget,
        accommodations: [],
        freeActivities: [],
        paidActivities: [],
        tips: [],
      },
      session: {
        messageCount: sessionUsage.messageCount + 1,
        maxFreeMessages: sessionUsage.maxFreeMessages,
        remaining: Math.max(0, sessionUsage.maxFreeMessages - (sessionUsage.messageCount + 1)),
        triggerPaywall: false,
      },
      flags: {
        showBookingForm: false,
        showUrgency: false,
        isSoldOut: availability.isSoldOut,
        currentPrice: finalPrice,
        currency: "TND",
        remainingSlots: availability.remaining,
        category,
        destination,
        explorerMode,
        visaFree: intent.visaFree,
        lowBudget: intent.lowBudget,
        triggerPaywall: false,
        showLeadForm: true,
      },
    }

    let metadata: {
      destination: string | null
      category: string | null
      budget: string | null
      keywords: string[]
      requestedDates: string | null
    } = {
      destination: destination ?? null,
      category: category ?? null,
      budget: null,
      keywords: [],
      requestedDates: null,
    }

    try {
      const json = JSON.parse(rawContent)
      parsed.message = typeof json.message === "string" ? json.message : ""
      parsed.itinerary = json.itinerary || null
      parsed.suggestedPackage = json.suggestedPackage || null

      if (json.metadata && typeof json.metadata === "object") {
        metadata.destination = typeof json.metadata.destination === "string" ? json.metadata.destination : destination ?? null
        metadata.category = typeof json.metadata.category === "string" ? json.metadata.category : category ?? null
        metadata.budget = typeof json.metadata.budget === "string" ? json.metadata.budget : null
        metadata.keywords = Array.isArray(json.metadata.keywords) ? json.metadata.keywords.filter((k: unknown) => typeof k === "string") : []
        metadata.requestedDates = typeof json.metadata.requestedDates === "string" ? json.metadata.requestedDates : null
      }
    } catch {
      // Fallback : si le modèle ne retourne pas du JSON, on renvoie le texte brut
      parsed.message = rawContent || "Je suis désolé, je n'ai pas pu formuler une réponse structurée."
    }

    // Vérrouillage serveur : troncature après le Jour 2 pour empêcher tout contournement du prompt
    if (parsed.itinerary && Array.isArray(parsed.itinerary.days) && parsed.itinerary.days.length > 2) {
      const paywallMessage =
        "[🔒 CONTENU PREMIUM VERROUILLÉ] Pour débloquer la suite de votre itinéraire exclusif jour par jour, obtenir les coordonnées de la maison d'hôte, du guide local, et bloquer votre tarif préférentiel en TND, veuillez finaliser votre demande ci-dessous pour recevoir votre lien de paiement d'acompte."
      const unlockedDays = parsed.itinerary.days.slice(0, 2)
      for (let i = 2; i < parsed.itinerary.days.length; i++) {
        unlockedDays.push({
          day: i + 1,
          morning: paywallMessage,
          midday: "",
          afternoon: "",
          evening: "",
          estimatedCost: null,
        })
      }
      parsed.itinerary.days = unlockedDays
    }

    // Enregistrement des tendances et du voyage généré en arrière-plan (fire-and-forget)
    Promise.resolve()
      .then(async () => {
        await db.insert(aiMarketTrends).values({
          sessionId,
          detectedDestination: metadata.destination,
          detectedCategory: metadata.category,
          budgetMention: metadata.budget,
          rawKeywords: metadata.keywords,
          detectedLanguage: intent.language === "ar" ? "derja" : intent.language === "en" ? "english" : "français",
          requestedDates: metadata.requestedDates,
        })

        if (parsed.itinerary && metadata.destination) {
          parsed.clientTripId = clientTripId
          await db.insert(clientTrips).values({
            id: clientTripId,
            sessionId,
            destination: metadata.destination,
            category: metadata.category || category,
            title: parsed.itinerary.title || `Voyage à ${metadata.destination}`,
            subtitle: parsed.itinerary.subtitle || null,
            itinerary: parsed.itinerary,
            totalEstimatedCost: parsed.itinerary.totalEstimatedCost || null,
            valueForMoneyScore: parsed.itinerary.valueForMoneyScore ?? null,
            calculatedPrice: String(finalPrice.toFixed(2)),
            status: "draft",
          })
        }
      })
      .catch((error) => {
        console.error("[orchestrator] background persistence failed:", error)
      })

    // Allocation familiale et budget matching
    if (intent.family) {
      const familyStructure = parseFamilyStructure(
        `${intent.family.adults} adultes et ${intent.family.children} enfants de ${intent.family.ages.join(", ")} ans`
      )
      const allocation = allocateRooms(familyStructure)
      parsed.family = {
        adults: intent.family.adults,
        children: intent.family.children,
        ages: intent.family.ages,
        rooms: allocation.rooms.map((r) => ({
          type: r.type,
          capacity: r.capacity,
          count: r.count,
          label: r.label,
        })),
      }
    }

    const maxBudget = detectBudget(message)
    if (maxBudget) {
      const matches = await findPackagesWithinBudget({
        maxBudget,
        category: category === "generic" ? undefined : category,
        destination: destination || undefined,
        userPhone,
      })
      parsed.budgetMatches = matches.map((m) => ({
        id: m.id,
        type: m.type,
        name: m.name,
        destination: m.destination,
        finalPrice: m.finalPrice,
        savings: m.savings,
        details: m.details,
      }))
    }

    // Données optimisateur budget réduit
    if (intent.lowBudget) {
      const optimizer = generateLowBudgetItinerary(destination)
      parsed.lowBudget = {
        active: true,
        accommodations: optimizer.accommodations,
        freeActivities: optimizer.freeActivities,
        paidActivities: optimizer.paidActivities,
        tips: optimizer.tips.map((t) => `${t.title}: ${t.description} (${t.estimatedCost}, ${t.savings})`),
      }
    }

    // Flags frontend
    const showBookingForm =
      availability.available && !availability.isSoldOut && !availability.notFound && !explorerMode
    const showUrgency = availability.triggerUrgence

    parsed.flags = {
      showBookingForm,
      showUrgency,
      isSoldOut: availability.isSoldOut,
      currentPrice: finalPrice,
      currency: "TND",
      remainingSlots: availability.remaining,
      category,
      destination,
      explorerMode,
      visaFree: intent.visaFree,
      lowBudget: intent.lowBudget,
      triggerPaywall: false,
      showLeadForm: true,
    }

    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Requête invalide", details: error.errors },
        { status: 400 }
      )
    }

    console.error("[orchestrator] error:", error)
    return NextResponse.json(
      {
        error: "Échec de l'orchestration du chat.",
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
