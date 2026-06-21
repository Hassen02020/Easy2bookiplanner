/**
 * destinationFilters.ts
 *
 * Taxonomie des exigences de visa pour les passeports tunisiens.
 * Permet à l'orchestrateur IA de filtrer instantanément les suggestions
 * et de proposer des options "Évasion sans visa" pour les demandes de
 * dernière minute.
 */

export type VisaRequirement =
  | "visa_free" // Sans visa
  | "visa_on_arrival" // Visa à l'arrivée
  | "e_visa" // e-Visa
  | "visa_required" // Visa obligatoire

export interface DestinationRequirement {
  destination: string
  visa: VisaRequirement
  label: string
  notes?: string
}

export const VISA_DESTINATIONS: DestinationRequirement[] = [
  // Sans visa
  { destination: "Tunisie", visa: "visa_free", label: "Sans visa", notes: "Pays natal" },
  { destination: "Turquie", visa: "visa_free", label: "Sans visa", notes: "90 jours" },
  { destination: "Maroc", visa: "visa_free", label: "Sans visa", notes: "90 jours" },
  { destination: "Jordanie", visa: "visa_free", label: "Sans visa", notes: "Visa à l'arrivée également possible" },
  { destination: "Mauritanie", visa: "visa_free", label: "Sans visa", notes: "Entrée libre" },
  { destination: "Sénégal", visa: "visa_free", label: "Sans visa", notes: "90 jours" },
  { destination: "Malte", visa: "visa_free", label: "Sans visa", notes: "Schengen nécessaire pour les longs séjours" },
  { destination: "Chypre", visa: "visa_free", label: "Sans visa", notes: "Schengen nécessaire pour les longs séjours" },
  { destination: "Oman", visa: "visa_free", label: "Sans visa", notes: "14 jours" },

  // Visa à l'arrivée
  { destination: "Cap-Vert", visa: "visa_on_arrival", label: "Visa à l'arrivée", notes: "Paiement à l'aéroport" },
  { destination: "Madagascar", visa: "visa_on_arrival", label: "Visa à l'arrivée", notes: "30 jours" },
  { destination: "Sri Lanka", visa: "visa_on_arrival", label: "Visa à l'arrivée", notes: "ETA possible aussi" },
  { destination: "Laos", visa: "visa_on_arrival", label: "Visa à l'arrivée", notes: "30 jours" },
  { destination: "Cambodge", visa: "visa_on_arrival", label: "Visa à l'arrivée", notes: "30 jours" },

  // e-Visa
  { destination: "Albanie", visa: "e_visa", label: "e-Visa", notes: "Très rapide pour les tunisiens" },
  { destination: "Géorgie", visa: "e_visa", label: "e-Visa", notes: "Délai 5 jours" },
  { destination: "Arménie", visa: "e_visa", label: "e-Visa", notes: "120 jours" },
  { destination: "Azerbaïdjan", visa: "e_visa", label: "e-Visa", notes: "ASAN" },
  { destination: "Kazakhstan", visa: "e_visa", label: "e-Visa", notes: "30 jours" },
  { destination: "Ouzbékistan", visa: "e_visa", label: "e-Visa", notes: "30 jours" },
  { destination: "Kirghizistan", visa: "e_visa", label: "e-Visa", notes: "60 jours" },
  { destination: "Indonésie", visa: "e_visa", label: "e-Visa", notes: "B211A pour Bali/Sumba" },
  { destination: "Malaisie", visa: "e_visa", label: "e-Visa", notes: "30 jours" },
  { destination: "Kenya", visa: "e_visa", label: "e-Visa", notes: "ETA" },
  { destination: "Rwanda", visa: "e_visa", label: "e-Visa", notes: "ETA" },
  { destination: "Égypte", visa: "e_visa", label: "e-Visa", notes: "e-Visa disponible" },

  // Visa obligatoire
  { destination: "Istanbul", visa: "visa_required", label: "Visa obligatoire", notes: "e-Visa turc disponible pour certains séjours" },
  { destination: "France", visa: "visa_required", label: "Visa obligatoire", notes: "Schengen requis" },
  { destination: "Italie", visa: "visa_required", label: "Visa obligatoire", notes: "Schengen requis" },
  { destination: "Espagne", visa: "visa_required", label: "Visa obligatoire", notes: "Schengen requis" },
  { destination: "Grèce", visa: "visa_required", label: "Visa obligatoire", notes: "Schengen requis" },
  { destination: "Portugal", visa: "visa_required", label: "Visa obligatoire", notes: "Schengen requis" },
  { destination: "Dubai", visa: "visa_required", label: "Visa obligatoire", notes: "Sponsorship hôtelier souvent nécessaire" },
  { destination: "Arabie Saoudite", visa: "visa_required", label: "Visa obligatoire", notes: "Omra : visa groupe via agence" },
]

/**
 * Récupère le statut visa d'une destination.
 */
export function getVisaRequirement(destination: string): DestinationRequirement | null {
  const normalized = destination.toLowerCase().trim()
  return (
    VISA_DESTINATIONS.find(
      (d) => d.destination.toLowerCase() === normalized || normalized.includes(d.destination.toLowerCase())
    ) || null
  )
}

/**
 * Filtre les destinations selon le statut visa souhaité.
 */
export function filterByVisa(destinations: string[], visa: VisaRequirement | VisaRequirement[]): string[] {
  const target = Array.isArray(visa) ? visa : [visa]
  return destinations.filter((destination) => {
    const requirement = getVisaRequirement(destination)
    return requirement && target.includes(requirement.visa)
  })
}

/**
 * Détecte si le message utilisateur mentionne une exigence de visa rapide.
 */
export function detectVisaFreeIntent(text: string): boolean {
  const lower = text.toLowerCase()
  const signals = [
    "sans visa",
    "visa free",
    "pas de visa",
    "évasion rapide",
    "dernière minute",
    "ce week-end",
    "demain",
    "urgent",
    "rapide",
    "flex",
    "facile",
    "pas de paperasse",
  ]
  return signals.some((signal) => lower.includes(signal))
}

/**
 * Retourne les destinations sans visa ou visa à l'arrivée recommandées
 * pour une évasion rapide.
 */
export function getQuickEscapeDestinations(): DestinationRequirement[] {
  return VISA_DESTINATIONS.filter(
    (d) => d.visa === "visa_free" || d.visa === "visa_on_arrival"
  )
}

/**
 * Formate une mention visa pour l'affichage dans les messages IA.
 */
export function formatVisaLabel(destination: string): string {
  const requirement = getVisaRequirement(destination)
  if (!requirement) return "Informations visa non disponibles"
  return `${requirement.label}${requirement.notes ? ` (${requirement.notes})` : ""}`
}
