/**
 * familyParser.ts
 *
 * Parseur de structure familiale pour Easy2Book.
 * Traduit une chaîne sémantique issue de l'IA (ex: "3 adultes et 2 enfants de 6 et 12 ans")
 * en un objet JSON structuré, puis propose l'allocation optimale des chambres.
 */

export interface Child {
  age: number
}

export interface FamilyStructure {
  adults: number
  children: Child[]
  totalTravelers: number
}

export interface RoomAllocation {
  type: "double" | "triple" | "family_suite" | "single" | "twin"
  capacity: number
  count: number
  label: string
  estimatedPriceMultiplier: number
}

export interface FamilyRecommendation {
  structure: FamilyStructure
  rooms: RoomAllocation[]
  totalCapacity: number
  recommendedFor: string
}

/**
 * Extrait les entiers d'une chaîne.
 */
function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+/g)
  return matches ? matches.map((n) => parseInt(n, 10)) : []
}

/**
 * Détecte le nombre d'adultes dans une chaîne.
 */
function detectAdults(text: string): number {
  const lower = text.toLowerCase()

  // Patterns explicites
  const adultMatch = /(\d+)\s*(adulte|adultes|personne|personnes|adult)/.exec(lower)
  if (adultMatch) {
    return parseInt(adultMatch[1], 10)
  }

  // Mots de remplacement
  const words = ["deux", "trois", "quatre", "cinq", "six", "sept", "huit"]
  for (let i = 0; i < words.length; i++) {
    if (lower.includes(`${words[i]} adultes`) || lower.includes(`${words[i]} adulte`)) {
      return i + 2
    }
  }

  return 2 // Défaut : couple
}

/**
 * Détecte les enfants et leurs âges dans une chaîne.
 */
function detectChildren(text: string): Child[] {
  const lower = text.toLowerCase()
  const children: Child[] = []

  // "2 enfants de 6 et 12 ans"
  const childrenWithAges = /(\d+)\s*enfant(s)?\s*de\s*((\d+)(\s*et\s*\d+)*\s*ans?)/.exec(lower)
  if (childrenWithAges) {
    const ages = extractNumbers(childrenWithAges[3])
    const count = parseInt(childrenWithAges[1], 10)
    for (let i = 0; i < count; i++) {
      children.push({ age: ages[i] || ages[ages.length - 1] || 6 })
    }
    return children
  }

  // "2 enfants (6 et 12 ans)"
  const childrenParentheses = /(\d+)\s*enfant(s)?\s*\(([^)]*)\)/.exec(lower)
  if (childrenParentheses) {
    const count = parseInt(childrenParentheses[1], 10)
    const ages = extractNumbers(childrenParentheses[3])
    for (let i = 0; i < count; i++) {
      children.push({ age: ages[i] || ages[ages.length - 1] || 6 })
    }
    return children
  }

  // "enfant de 6 ans et enfant de 12 ans"
  const childAges = lower.match(/enfant(s)?\s*de\s*(\d+)\s*ans?/g)
  if (childAges) {
    for (const match of childAges) {
      const age = extractNumbers(match)[0]
      if (age !== undefined) children.push({ age })
    }
  }

  return children
}

/**
 * Parse une chaîne sémantique en structure familiale.
 */
export function parseFamilyStructure(text: string): FamilyStructure {
  const adults = detectAdults(text)
  const children = detectChildren(text)

  return {
    adults,
    children,
    totalTravelers: adults + children.length,
  }
}

/**
 * Calcule l'allocation optimale des chambres selon la composition familiale.
 */
export function allocateRooms(structure: FamilyStructure): FamilyRecommendation {
  const { adults, children, totalTravelers } = structure

  const rooms: RoomAllocation[] = []

  if (totalTravelers <= 2) {
    rooms.push({ type: "double", capacity: 2, count: 1, label: "Chambre double", estimatedPriceMultiplier: 1 })
  } else if (totalTravelers === 3) {
    rooms.push({ type: "triple", capacity: 3, count: 1, label: "Chambre triple", estimatedPriceMultiplier: 1.35 })
  } else if (totalTravelers === 4 && children.length === 2) {
    // 2 adultes + 2 enfants : suite familiale souvent plus avantageuse
    rooms.push({
      type: "family_suite",
      capacity: 4,
      count: 1,
      label: "Suite familiale",
      estimatedPriceMultiplier: 1.8,
    })
  } else if (totalTravelers === 4) {
    rooms.push({ type: "double", capacity: 2, count: 2, label: "2 chambres doubles", estimatedPriceMultiplier: 2 })
  } else if (totalTravelers === 5) {
    rooms.push({ type: "triple", capacity: 3, count: 1, label: "Chambre triple", estimatedPriceMultiplier: 1.35 })
    rooms.push({ type: "double", capacity: 2, count: 1, label: "Chambre double", estimatedPriceMultiplier: 1 })
  } else {
    // Groupe : 2 chambres triples ou triple + double
    const triples = Math.floor(totalTravelers / 3)
    const remainder = totalTravelers % 3
    if (triples > 0) {
      rooms.push({ type: "triple", capacity: 3, count: triples, label: `${triples} chambre(s) triple`, estimatedPriceMultiplier: 1.35 * triples })
    }
    if (remainder === 1) {
      rooms.push({ type: "single", capacity: 1, count: 1, label: "Chambre single", estimatedPriceMultiplier: 0.7 })
    } else if (remainder === 2) {
      rooms.push({ type: "double", capacity: 2, count: 1, label: "Chambre double", estimatedPriceMultiplier: 1 })
    }
  }

  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity * room.count, 0)
  const recommendedFor = children.length > 0
    ? `Famille avec ${adults} adulte(s) et ${children.length} enfant(s)`
    : `${adults} adulte(s)`

  return {
    structure,
    rooms,
    totalCapacity,
    recommendedFor,
  }
}

/**
 * Estime le prix net d'un séjour hôtelier selon la structure familiale.
 */
export function estimateFamilyPrice(
  basePricePerNight: number,
  nights: number,
  recommendation: FamilyRecommendation
): number {
  const multiplier = recommendation.rooms.reduce(
    (sum, room) => sum + room.estimatedPriceMultiplier * room.count,
    0
  )
  return basePricePerNight * nights * multiplier
}

/**
 * Détecte si le message contient une structure familiale.
 */
export function containsFamilyStructure(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    /enfant/.test(lower) ||
    /adulte/.test(lower) ||
    /famille/.test(lower) ||
    /bébé/.test(lower) ||
    /bébés/.test(lower)
  )
}
