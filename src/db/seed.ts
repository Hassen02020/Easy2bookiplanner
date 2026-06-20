import { db } from "./index"
import {
  hotels,
  hotelTranslations,
  flights,
  organizedTrips,
  organizedTripTranslations,
  pricingRules,
  packageInventory,
} from "./schema"
import "dotenv/config"

async function seed() {
  console.log("[seed] Démarrage du seeding Easy2Book...")
  console.log("[seed] Chargement des variables d'environnement et connexion à la base...")

  const seededHotels = await db
    .insert(hotels)
    .values([
      {
        stars: 5,
        basePricePerNight: "320.00",
        destination: "Hammamet",
        isActive: true,
      },
      {
        stars: 4,
        basePricePerNight: "180.00",
        destination: "Sousse",
        isActive: true,
      },
      {
        stars: 3,
        basePricePerNight: "120.00",
        destination: "Tabarka",
        isActive: true,
      },
      {
        stars: 5,
        basePricePerNight: "290.00",
        destination: "Djerba",
        isActive: true,
      },
    ])
    .returning({ id: hotels.id, destination: hotels.destination })

  await db.insert(hotelTranslations).values([
    {
      hotelId: seededHotels[0].id,
      language: "fr",
      name: "La Badira Hammamet",
      description: "Élégant hôtel 5 étoiles au cœur de Hammamet avec vue sur la mer Méditerranée.",
      amenitiesTranslated: ["Piscine", "Spa", "Wi-Fi", "Restaurant", "Plage privée"],
    },
    {
      hotelId: seededHotels[0].id,
      language: "ar",
      name: "لا باديرة الحمامات",
      description: "فندق 5 نجوم أنيق في قلب الحمامات مع إطلالة على البحر الأبيض المتوسط.",
      amenitiesTranslated: ["مسبح", "سبا", "واي فاي", "مطعم", "شاطئ خاص"],
    },
    {
      hotelId: seededHotels[0].id,
      language: "en",
      name: "La Badira Hammamet",
      description: "Elegant 5-star hotel in the heart of Hammamet overlooking the Mediterranean Sea.",
      amenitiesTranslated: ["Pool", "Spa", "Wi-Fi", "Restaurant", "Private Beach"],
    },
    {
      hotelId: seededHotels[1].id,
      language: "fr",
      name: "Mövenpick Sousse",
      description: "Hôtel 4 étoiles en bord de mer à Sousse, idéal pour les familles et les couples.",
      amenitiesTranslated: ["Piscine", "Salle de sport", "Wi-Fi", "Petit-déjeuner", "Plage"],
    },
    {
      hotelId: seededHotels[1].id,
      language: "ar",
      name: "موفنبيك سوسة",
      description: "فندق 4 نجوم على البحر في سوسة، مثالي للعائلات والأزواج.",
      amenitiesTranslated: ["مسبح", "صالة رياضية", "واي فاي", "إفطار", "شاطئ"],
    },
    {
      hotelId: seededHotels[1].id,
      language: "en",
      name: "Mövenpick Sousse",
      description: "4-star beachfront hotel in Sousse, ideal for families and couples.",
      amenitiesTranslated: ["Pool", "Gym", "Wi-Fi", "Breakfast", "Beach"],
    },
    {
      hotelId: seededHotels[2].id,
      language: "fr",
      name: "Tabarka Marina",
      description: "Hôtel 3 étoiles confortable près de la marina de Tabarka, parfait pour la plongée.",
      amenitiesTranslated: ["Piscine", "Centre de plongée", "Wi-Fi", "Restaurant"],
    },
    {
      hotelId: seededHotels[2].id,
      language: "ar",
      name: "مارينا طبرقة",
      description: "فندق 3 نجوم مريح بالقرب من مارينا طبرقة، مثالي للغطس.",
      amenitiesTranslated: ["مسبح", "مركز غطس", "واي فاي", "مطعم"],
    },
    {
      hotelId: seededHotels[2].id,
      language: "en",
      name: "Tabarka Marina",
      description: "Comfortable 3-star hotel near Tabarka marina, perfect for diving.",
      amenitiesTranslated: ["Pool", "Diving Center", "Wi-Fi", "Restaurant"],
    },
    {
      hotelId: seededHotels[3].id,
      language: "fr",
      name: "Hasdrubal Prestige Djerba",
      description: "Palace 5 étoiles à Djerba alliant luxe tunisien et vue imprenable sur la mer.",
      amenitiesTranslated: ["Spa", "Thalasso", "Piscine", "Wi-Fi", "Restaurant"],
    },
    {
      hotelId: seededHotels[3].id,
      language: "ar",
      name: "حسدروبال برستيج جربة",
      description: "قصر 5 نجوم في جربة يجمع بين الفخامة التونسية وإطلالة خلابة على البحر.",
      amenitiesTranslated: ["سبا", "تالاسو", "مسبح", "واي فاي", "مطعم"],
    },
    {
      hotelId: seededHotels[3].id,
      language: "en",
      name: "Hasdrubal Prestige Djerba",
      description: "5-star palace in Djerba combining Tunisian luxury and stunning sea views.",
      amenitiesTranslated: ["Spa", "Thalassotherapy", "Pool", "Wi-Fi", "Restaurant"],
    },
  ])

  await db.insert(flights).values([
    {
      airline: "Tunisair",
      departureAirport: "TUN",
      arrivalAirport: "CDG",
      departureTime: new Date("2026-07-15T08:00:00Z"),
      arrivalTime: new Date("2026-07-15T11:30:00Z"),
      price: "450.00",
    },
    {
      airline: "Tunisair",
      departureAirport: "TUN",
      arrivalAirport: "IST",
      departureTime: new Date("2026-07-20T14:00:00Z"),
      arrivalTime: new Date("2026-07-20T18:30:00Z"),
      price: "520.00",
    },
    {
      airline: "Tunisair Express",
      departureAirport: "DJE",
      arrivalAirport: "TUN",
      departureTime: new Date("2026-07-10T09:00:00Z"),
      arrivalTime: new Date("2026-07-10T10:00:00Z"),
      price: "85.00",
    },
  ])

  await db.insert(pricingRules).values([
    // 1. Omra : majoration globale de 8%
    { category: "omra", ruleType: "markup_percentage", value: "8", isActive: true },

    // 2. Voyage organisé Istanbul : prix forcé (override) pour tester le moteur
    { category: "istanbul", destination: "Istanbul", ruleType: "override", value: "1890.00", isActive: true },

    // 3. Hôtels locaux Hammamet : remise fixe de 30 TND (Early Booking / dernière minute)
    { category: "hotel", destination: "Hammamet", ruleType: "discount_fixed", value: "30", isActive: true },

    // Règles génériques complémentaires pour enrichir le jeu de données
    { category: "hotel", destination: "Sousse", ruleType: "markup_percentage", value: "12", isActive: true },
    { category: "hotel", destination: "Tabarka", ruleType: "markup_percentage", value: "10", isActive: true },
    { category: "hotel", destination: "Djerba", ruleType: "markup_percentage", value: "18", isActive: true },
    { category: "flight", ruleType: "markup_percentage", value: "8", isActive: true },
    { category: "generic", ruleType: "markup_percentage", value: "10", isActive: true },
  ])

  const seededTrips = await db
    .insert(organizedTrips)
    .values([
      {
        departureDate: new Date("2026-08-01T06:00:00Z"),
        returnDate: new Date("2026-08-07T20:00:00Z"),
        price: "1890.00",
        availableSeats: 18,
      },
      {
        departureDate: new Date("2026-09-10T06:00:00Z"),
        returnDate: new Date("2026-09-17T20:00:00Z"),
        price: "2450.00",
        availableSeats: 12,
      },
      {
        departureDate: new Date("2026-12-01T06:00:00Z"),
        returnDate: new Date("2026-12-09T20:00:00Z"),
        price: "4200.00",
        availableSeats: 20,
      },
    ])
    .returning({ id: organizedTrips.id })

  await db.insert(organizedTripTranslations).values([
    {
      tripId: seededTrips[0].id,
      language: "fr",
      title: "Istanbul Classique 7 jours",
      description: "Découvrez Istanbul avec vols, hôtel 4 étoiles, petits-déjeuners et visites guidées incluses.",
      includedServices: ["Vol A/R", "Hôtel 4*", "Petit-déjeuner", "Visites guidées", "Transferts"],
    },
    {
      tripId: seededTrips[0].id,
      language: "ar",
      title: "إسطنبول الكلاسيكية 7 أيام",
      description: "اكتشف إسطنبول مع رحلات الطيران، فندق 4 نجوم، الإفطار والجولات المصحوبة بمرشدين.",
      includedServices: ["طيران ذهاب وعودة", "فندق 4 نجوم", "إفطار", "جولات مصحوبة", "نقل"],
    },
    {
      tripId: seededTrips[0].id,
      language: "en",
      title: "Classic Istanbul 7 Days",
      description: "Discover Istanbul with return flights, 4-star hotel, breakfasts and guided tours included.",
      includedServices: ["Return flights", "4-star hotel", "Breakfast", "Guided tours", "Transfers"],
    },
    {
      tripId: seededTrips[1].id,
      language: "fr",
      title: "Capverde Soleil 8 jours",
      description: "Séjour tout inclus à Sal, Cap-Vert : vols, hôtel tout compris et excursions maritimes.",
      includedServices: ["Vol A/R", "Hôtel tout inclus", "Excursions", "Transferts"],
    },
    {
      tripId: seededTrips[1].id,
      language: "ar",
      title: "رحلة كاب فيردي 8 أيام",
      description: "إقامة شاملة في سال، كاب فيردي: طيران، فندق شامل كليًا ورحلات بحرية.",
      includedServices: ["طيران ذهاب وعودة", "فندق شامل كليًا", "رحلات", "نقل"],
    },
    {
      tripId: seededTrips[1].id,
      language: "en",
      title: "Cape Verde Sun 8 Days",
      description: "All-inclusive stay in Sal, Cape Verde: flights, all-inclusive hotel and sea excursions.",
      includedServices: ["Return flights", "All-inclusive hotel", "Excursions", "Transfers"],
    },
    {
      tripId: seededTrips[2].id,
      language: "fr",
      title: "Omra Prestige 9 jours",
      description: "Pèlerinage Omra complet avec vols directs, hôtel à proximité du Haram, pension complète et accompagnement spirituel.",
      includedServices: ["Vol direct A/R", "Hôtel 5*", "Pension complète", "Transferts", "Accompagnement spirituel"],
    },
    {
      tripId: seededTrips[2].id,
      language: "ar",
      title: "عمرة بريستيج 9 أيام",
      description: "حج عمرة كامل مع رحلات طيران مباشرة، فندق بالقرب من الحرم، إقامة كاملة ورعاية روحانية.",
      includedServices: ["طيران مباشر ذهاب وعودة", "فندق 5 نجوم", "إقامة كاملة", "نقل", "رعاية روحانية"],
    },
    {
      tripId: seededTrips[2].id,
      language: "en",
      title: "Omra Prestige 9 Days",
      description: "Complete Umrah pilgrimage with direct flights, hotel near the Haram, full board and spiritual guidance.",
      includedServices: ["Direct return flights", "5-star hotel", "Full board", "Transfers", "Spiritual guidance"],
    },
  ])

  await db.insert(packageInventory).values([
    {
      packageName: "Istanbul Classique 7 jours",
      category: "istanbul",
      destination: "Istanbul",
      totalSlots: 18,
      bookedSlots: 12,
      thresholdUrgency: 3,
      isSoldOut: false,
    },
    {
      packageName: "Capverde Soleil 8 jours",
      category: "generic",
      destination: "Cap-Vert",
      totalSlots: 12,
      bookedSlots: 9,
      thresholdUrgency: 2,
      isSoldOut: false,
    },
    {
      packageName: "Omra Prestige 9 jours",
      category: "omra",
      destination: "Makkah",
      totalSlots: 20,
      bookedSlots: 20,
      thresholdUrgency: 3,
      isSoldOut: true,
    },
  ])

  console.log("[seed] Insertion des données terminée.")
  console.log("[seed] Résumé :")
  console.log("  - Hôtels : 4 établissements avec traductions FR/AR/EN")
  console.log("  - Vols : 3 vols (Tunisair, Tunisair Express)")
  console.log("  - Voyages organisés : 3 packages (Istanbul, Cap-Vert, Omra)")
  console.log("  - Règles de tarification : Omra +8%, Istanbul override, Hammamet -30 TND")
  console.log("  - Stocks : 3 packages avec seuils d'urgence et états sold-out")
  console.log("[seed] Fermeture de la connexion et sortie.")
}

seed()
  .then(() => {
    console.log("[seed] ✅ Seeding terminé avec succès.")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[seed] ❌ Seeding failed:", error)
    process.exit(1)
  })
