import { notFound } from "next/navigation"
import { db } from "@/db"
import { clientTrips } from "@/db/schema"
import { eq } from "drizzle-orm"
import { TripBook } from "@/components/trip-book"

/**
 * Trip Live Page
 *
 * Affiche le "Live Trip-Book" personnalisé d'un client.
 * Server Component Next.js 15 qui récupère l'itinéraire généré
 * et le rend avec une mise en page ultra-premium mobile-first.
 */

interface TripPageProps {
  params: Promise<{ id: string }>
}

export default async function TripPage({ params }: TripPageProps) {
  const { id } = await params

  const rows = await db
    .select()
    .from(clientTrips)
    .where(eq(clientTrips.id, id))
    .limit(1)

  if (rows.length === 0) {
    notFound()
  }

  const trip = rows[0]

  return (
    <TripBook
      id={trip.id}
      title={trip.title}
      subtitle={trip.subtitle}
      destination={trip.destination}
      category={trip.category}
      calculatedPrice={trip.calculatedPrice}
      totalEstimatedCost={trip.totalEstimatedCost}
      valueForMoneyScore={trip.valueForMoneyScore}
      itinerary={trip.itinerary}
    />
  )
}
