import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { promotions } from "@/db/schema"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get("hotelId")
    const activeOnly = searchParams.get("active") === "true"

    let query = db.select().from(promotions)
    if (hotelId) {
      query = query.where(eq(promotions.hotelId, hotelId)) as typeof query
    }
    if (activeOnly) {
      query = query.where(eq(promotions.isActive, true)) as typeof query
    }

    const result = await query.orderBy(promotions.createdAt)
    return NextResponse.json({ promotions: result })
  } catch (error) {
    console.error("GET /api/promotions error:", error)
    return NextResponse.json({ error: "Failed to fetch promotions", details: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hotelId, title, promoPrice, bookingStart, bookingEnd, travelStart, travelEnd, childPolicy } = body

    if (!title || !promoPrice) {
      return NextResponse.json({ error: "Missing required fields: title, promoPrice" }, { status: 400 })
    }

    const [promo] = await db.insert(promotions).values({
      hotelId: hotelId || null,
      title,
      promoPrice: promoPrice.toString(),
      bookingStart: bookingStart ? new Date(bookingStart) : null,
      bookingEnd: bookingEnd ? new Date(bookingEnd) : null,
      travelStart: travelStart ? new Date(travelStart) : null,
      travelEnd: travelEnd ? new Date(travelEnd) : null,
      childPolicy: childPolicy || null,
      isActive: true,
    }).returning()

    return NextResponse.json({ promotion: promo }, { status: 201 })
  } catch (error) {
    console.error("POST /api/promotions error:", error)
    return NextResponse.json({ error: "Failed to create promotion", details: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, promoPrice, isActive, childPolicy } = body

    if (!id) {
      return NextResponse.json({ error: "Missing promotion id" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (promoPrice !== undefined) updateData.promoPrice = promoPrice.toString()
    if (isActive !== undefined) updateData.isActive = isActive
    if (childPolicy !== undefined) updateData.childPolicy = childPolicy

    await db.update(promotions).set(updateData).where(eq(promotions.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/promotions error:", error)
    return NextResponse.json({ error: "Failed to update promotion", details: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Missing promotion id" }, { status: 400 })
    }
    await db.delete(promotions).where(eq(promotions.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/promotions error:", error)
    return NextResponse.json({ error: "Failed to delete promotion", details: (error as Error).message }, { status: 500 })
  }
}
