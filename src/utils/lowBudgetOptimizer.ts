/**
 * lowBudgetOptimizer.ts
 *
 * Algorithme d'optimisation "Budget Réduit" pour Easy2Book.
 * S'active lorsque l'utilisateur mentionne un budget serré ou demande
 * un bon plan économique. Génère des itinéraires alternatifs qui minimisent
 * les coûts d'hébergement et valorisent les activités gratuites ou à très bas coût.
 */

export type BudgetTier = "very_low" | "low" | "moderate"

export interface LowBudgetTip {
  category: "hebergement" | "activite" | "restauration" | "transport" | "parc"
  title: string
  description: string
  estimatedCost: "gratuit" | string
  savings: string
}

export interface LowBudgetItinerary {
  tier: BudgetTier
  maxBudgetIndication: string
  accommodations: string[]
  freeActivities: string[]
  paidActivities: string[]
  localFood: string[]
  tips: LowBudgetTip[]
  totalEstimated: string
}

const LOW_BUDGET_KEYWORDS = [
  "pas cher",
  "pas chère",
  "bon plan",
  "budget serré",
  "petit budget",
  "économique",
  "low cost",
  "cheap",
  " affordable",
  "économies",
  "étudiant",
  "famille nombreuse",
  "moindre coût",
  "moins cher",
  "promo",
  "rabais",
  "gratuit",
  "free",
  "basket",
]

export function detectLowBudgetIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return LOW_BUDGET_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export function extractBudgetTier(text: string): BudgetTier {
  const lower = text.toLowerCase()
  if (/très|tres|vraiment|ultra|extreme|minimum/.test(lower) && /petit|serré|pas cher|budget/.test(lower)) {
    return "very_low"
  }
  if (/petit budget|serré|économique|pas cher|low cost|cheap/.test(lower)) {
    return "low"
  }
  return "moderate"
}

export function generateLowBudgetItinerary(destination?: string | null): LowBudgetItinerary {
  const tier = "low"
  const base = destination || "Tunisie"

  return {
    tier,
    maxBudgetIndication: "À partir de 150 TND / personne / week-end",
    accommodations: [
      "Maison d'hôte chez l'habitant avec petit-déjeuner local",
      "Gîte rural (Ain Draham, Beni Mtir, Toujane)",
      "Camping équipé avec vue nature",
      "Auberge de jeunesse éco-responsable",
    ],
    freeActivities: [
      `Visite des ruines romaines accessibles librement autour de ${base}`,
      "Randonnée sous les chênes-lièges d'Ain Draham",
      "Baignade dans les criques sauvages de Cap Serrat",
      "Observation des flamants roses au Lac de Tunis ou à Djerba",
      "Balade dans les souks et médinas",
      "Coucher de soleil sur les ksour de Toujane",
    ],
    paidActivities: [
      "Entrée parc national de l'Ichkeul (tarif réduit étudiant/famille)",
      "Nahrawess ou Safa Aquapark (ticket en ligne moins cher)",
      "Visite guidée officielle de Dougga ou El Jem",
    ],
    localFood: [
      "Couscous au mérou dans une maison d'hôte",
      "Harissa artisanale de Nabeul",
      "Miel de Beni Mtir et figues de Djebba",
      "Huile d'olive locale de Mornag ou Sfax",
      "Fromage artisanal de Béja",
    ],
    tips: [
      {
        category: "hebergement",
        title: "Maison d'hôte vs hôtel",
        description: "Préférez les chambres d'hôte locales : 30 à 50% moins cher qu'un hôtel classique et expérience authentique.",
        estimatedCost: "80-120 TND/nuit",
        savings: "-40%",
      },
      {
        category: "activite",
        title: "Ruines en accès libre",
        description: "Certaines ruines romaines mineures sont gratuites ou très peu chères en dehors des circuits officiels.",
        estimatedCost: "gratuit",
        savings: "100%",
      },
      {
        category: "restauration",
        title: "Manger local",
        description: "Les tables d'hôte et restaurants populaires locaux proposent des portions généreuses à prix bas.",
        estimatedCost: "15-25 TND/repas",
        savings: "-50%",
      },
      {
        category: "transport",
        title: "Covoiturage et louages",
        description: "Utilisez les louages (taxis collectifs) pour les courts trajets et le covoiturage entre villes.",
        estimatedCost: "5-30 TND/trajet",
        savings: "-60%",
      },
      {
        category: "parc",
        title: "Parcs aquatiques en promo",
        description: "Nahrawess et Safa Aquapark proposent souvent des tarifs famille en ligne ou en semaine.",
        estimatedCost: "40-60 TND",
        savings: "-30%",
      },
    ],
    totalEstimated: "150-250 TND / personne pour 2 jours",
  }
}

/**
 * Retourne des suggestions d'activités gratuites ou à bas coût liées
 * à un patrimoine spécifique (ruines, faune, terroir, festival...).
 */
export function getHeritageBudgetActivities(
  heritage: "ruines" | "faune" | "flore" | "terroir" | "festivals" | "aquapark"
): LowBudgetTip[] {
  const map: Record<typeof heritage, LowBudgetTip[]> = {
    ruines: [
      {
        category: "activite",
        title: "Ruines romaines de Makthar",
        description: "Site majestueux et moins fréquenté que Dougga, avec un accès abordable.",
        estimatedCost: "10-15 TND",
        savings: "-50% vs circuits",
      },
    ],
    faune: [
      {
        category: "activite",
        title: "Observation des flamants roses",
        description: "Lac de Tunis et Djerba : observation gratuite le matin ou au coucher du soleil.",
        estimatedCost: "gratuit",
        savings: "100%",
      },
    ],
    flore: [
      {
        category: "activite",
        title: "Randonnée sous les chênes-lièges",
        description: "Ain Draham : sentiers balisés à travers les forêts de chênes-lièges.",
        estimatedCost: "gratuit",
        savings: "100%",
      },
    ],
    terroir: [
      {
        category: "restauration",
        title: "Dégustation chez le producteur",
        description: "Miel de Beni Mtir, huile d'olive de Mornag : achat direct auprès du producteur.",
        estimatedCost: "20-40 TND",
        savings: "-30% vs boutique",
      },
    ],
    festivals: [
      {
        category: "activite",
        title: "Festivals locaux",
        description: "Jazz de Tabarka, Symphonies d'El Jem, Fêtes des agrumes de Nabeul : concerts en plein air.",
        estimatedCost: "gratuit à 30 TND",
        savings: "-70%",
      },
    ],
    aquapark: [
      {
        category: "parc",
        title: "Parcs aquatiques locaux",
        description: "Nahrawess, Safa Aquapark : tickets famille et en semaine pour réduire la facture.",
        estimatedCost: "40-60 TND",
        savings: "-30%",
      },
    ],
  }

  return map[heritage]
}
