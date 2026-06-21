/**
 * guidesService.ts
 *
 * Catalogue des guides locaux et micro-expériences Easy2Book.
 * Utilisé par l'API /api/experiences/guides et l'orchestrateur IA.
 */

export interface LocalGuide {
  id: string
  name: string
  zone: string
  category: string
  activity: string
  description: string
  duration: string
  pricePerPerson: number
  maxGroupSize: number
  languages: string[]
  rating: number
  imageUrl?: string
}

export const LOCAL_GUIDES_CATALOG: LocalGuide[] = [
  // Beni Mtir
  {
    id: "guide-beni-mtir-01",
    name: "Slimane - Guide montagnard",
    zone: "Beni Mtir",
    category: "randonnée",
    activity: "Randonnée des cascades",
    description: "Traversée des gorges, baignades dans les cascades et pique-nique bio local.",
    duration: "4h",
    pricePerPerson: 65,
    maxGroupSize: 8,
    languages: ["fr", "ar"],
    rating: 4.9,
  },
  {
    id: "guide-beni-mtir-02",
    name: "Eco-Lodge Les Pins",
    zone: "Beni Mtir",
    category: "aventure",
    activity: "Nuit en éco-lodge",
    description: "Glamping durable avec vue sur les montagnes, dîner de produits locaux.",
    duration: "1 nuit",
    pricePerPerson: 180,
    maxGroupSize: 6,
    languages: ["fr", "en"],
    rating: 4.8,
  },
  // Toujane
  {
    id: "guide-toujane-01",
    name: "Fatma - Hôtesse troglodyte",
    zone: "Toujane",
    category: "culture",
    activity: "Immersion chez l'habitant",
    description: "Cuisine berbère traditionnelle, contes et visite du ksar.",
    duration: "3h",
    pricePerPerson: 55,
    maxGroupSize: 6,
    languages: ["fr", "ar"],
    rating: 4.9,
  },
  // Matmata
  {
    id: "guide-matmata-01",
    name: "Ali - Spéléologue",
    zone: "Matmata",
    category: "culture",
    activity: "Visite des habitats troglodytiques",
    description: "Découverte des maisons de cavernes, thé à la menthe et artisanat local.",
    duration: "2h30",
    pricePerPerson: 45,
    maxGroupSize: 10,
    languages: ["fr", "ar"],
    rating: 4.7,
  },
  // Ghar El Melh
  {
    id: "guide-ghar-el-melh-01",
    name: "Khaled - Kayak guide",
    zone: "Ghar El Melh",
    category: "aventure",
    activity: "Kayak dans les criques",
    description: "Balade en kayak de mer, exploration des criques cachées et déjeuner de poisson.",
    duration: "3h",
    pricePerPerson: 75,
    maxGroupSize: 8,
    languages: ["fr", "en"],
    rating: 4.8,
  },
  // Haouaria
  {
    id: "guide-haouaria-01",
    name: "Moncef - Ornithologue",
    zone: "Haouaria",
    category: "randonnée",
    activity: "Observation des rapaces",
    description: "Session d'observation des faucons pèlerins et randonnée côtière.",
    duration: "2h",
    pricePerPerson: 50,
    maxGroupSize: 12,
    languages: ["fr", "ar"],
    rating: 4.8,
  },
  // Cap Serrat
  {
    id: "guide-cap-serrat-01",
    name: "Nadia - Guide nature",
    zone: "Cap Serrat",
    category: "randonnée",
    activity: "Retraite nature sauvage",
    description: "Randonnée côtière, baignade dans des criques isolées et dégustation de fruits de mer.",
    duration: "5h",
    pricePerPerson: 90,
    maxGroupSize: 6,
    languages: ["fr", "en"],
    rating: 4.9,
  },
  // Zriba El Alia
  {
    id: "guide-zriba-01",
    name: "Aymen - Guide patrimoine",
    zone: "Zriba El Alia",
    category: "culture",
    activity: "Visite du village berbère perché",
    description: "Exploration du village abandonné, dégustation de miel et randonnée dans les Djebel.",
    duration: "3h",
    pricePerPerson: 40,
    maxGroupSize: 10,
    languages: ["fr", "ar"],
    rating: 4.7,
  },
  // Istanbul
  {
    id: "guide-istanbul-01",
    name: "Mehmet - Guide culturel",
    zone: "Istanbul",
    category: "culture",
    activity: "Balade insolite dans les ruelles de Fener-Balat",
    description: "Immersion dans les quartiers authentiques, cafés historiques et street-food.",
    duration: "4h",
    pricePerPerson: 45,
    maxGroupSize: 6,
    languages: ["fr", "en"],
    rating: 4.9,
  },
  // Cappadoce
  {
    id: "guide-cappadoce-01",
    name: "Ahmet - Guide montgolfière",
    zone: "Cappadoce",
    category: "aventure",
    activity: "Vol en montgolfière au lever du soleil",
    description: "Vol privilège au-dessus des cheminées de fées avec petit-déjeuner.",
    duration: "3h",
    pricePerPerson: 120,
    maxGroupSize: 16,
    languages: ["fr", "en"],
    rating: 4.9,
  },
]

export function findGuidesByZone(zone: string, category: string = "tous"): LocalGuide[] {
  const normalizedZone = zone.toLowerCase().trim()
  return LOCAL_GUIDES_CATALOG.filter((guide) => {
    const zoneMatch = guide.zone.toLowerCase().includes(normalizedZone) || normalizedZone.includes(guide.zone.toLowerCase())
    const categoryMatch = category === "tous" || guide.category === category
    return zoneMatch && categoryMatch
  })
}
