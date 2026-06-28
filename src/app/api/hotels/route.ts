import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { hotels, hotelTranslations, promotions } from "@/db/schema"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const destination = searchParams.get("destination")
    const stars = searchParams.get("stars")
    const activeOnly = searchParams.get("active") === "true"

    let query = db.select().from(hotels)

    if (destination) {
      query = query.where(eq(hotels.destination, destination)) as typeof query
    }
    if (stars) {
      query = query.where(eq(hotels.stars, parseInt(stars))) as typeof query
    }
    if (activeOnly) {
      query = query.where(eq(hotels.isActive, true)) as typeof query
    }

    const hotelList = await query.orderBy(hotels.createdAt)

    const hotelData = await Promise.all(
      hotelList.map(async (hotel) => {
        const translations = await db
          .select()
          .from(hotelTranslations)
          .where(eq(hotelTranslations.hotelId, hotel.id))
        const activePromotions = await db
          .select()
          .from(promotions)
          .where(eq(promotions.hotelId, hotel.id))

        return {
          ...hotel,
          translations,
          hasPromotions: activePromotions.length > 0,
        }
      })
    )

    return NextResponse.json({ hotels: hotelData })
  } catch (error) {
    console.error("GET /api/hotels error:", error)
    return NextResponse.json(
      { error: "Failed to fetch hotels", details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stars, basePricePerNight, destination, name, description, language = "fr" } = body

    if (!stars || !basePricePerNight || !destination || !name) {
      return NextResponse.json(
        { error: "Missing required fields: stars, basePricePerNight, destination, name" },
        { status: 400 }
      )
    }

    const [hotel] = await db
      .insert(hotels)
      .values({
        stars: parseInt(stars),
        basePricePerNight: basePricePerNight.toString(),
        destination,
        isActive: true,
      })
      .returning()

    await db.insert(hotelTranslations).values({
      hotelId: hotel.id,
      language,
      name,
      description: description || null,
    })

    return NextResponse.json({ hotel }, { status: 201 })
  } catch (error) {
    console.error("POST /api/hotels error:", error)
    return NextResponse.json(
      { error: "Failed to create hotel", details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, stars, basePricePerNight, destination, isActive, name, description, language = "fr" } = body

    if (!id) {
      return NextResponse.json({ error: "Missing hotel id" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (stars !== undefined) updateData.stars = parseInt(stars)
    if (basePricePerNight !== undefined) updateData.basePricePerNight = basePricePerNight.toString()
    if (destination !== undefined) updateData.destination = destination
    if (isActive !== undefined) updateData.isActive = isActive

    if (Object.keys(updateData).length > 0) {
      await db.update(hotels).set(updateData).where(eq(hotels.id, id))
    }

    if (name || description) {
      const existing = await db
        .select()
        .from(hotelTranslations)
        .where(eq(hotelTranslations.hotelId, id))

      const translationData: Record<string, unknown> = {}
      if (name) translationData.name = name
      if (description) translationData.description = description

      if (existing.some((t) => t.language === language)) {
        await db
          .update(hotelTranslations)
          .set(translationData)
          .where(eq(hotelTranslations.hotelId, id))
      } else {
        await db.insert(hotelTranslations).values({
          hotelId: id,
          language,
          name: name || "Untitled",
          description: description || null,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/hotels error:", error)
    return NextResponse.json(
      { error: "Failed to update hotel", details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing hotel id" }, { status: 400 })
    }

    await db.delete(hotels).where(eq(hotels.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/hotels error:", error)
    return NextResponse.json(
      { error: "Failed to delete hotel", details: (error as Error).message },
      { status: 500 }
    )
  }
}
