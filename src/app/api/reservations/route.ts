import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { reservations, reservationStatusEnum } from "@/db/schema"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId")
    const hotelId = searchParams.get("hotelId")
    const status = searchParams.get("status")

    let query = db.select().from(reservations)
    if (leadId) {
      query = query.where(eq(reservations.leadId, leadId)) as typeof query
    }
    if (hotelId) {
      query = query.where(eq(reservations.hotelId, hotelId)) as typeof query
    }
    if (status) {
      query = query.where(eq(reservations.status, status as typeof reservationStatusEnum.enumValues[number])) as typeof query
    }

    const result = await query.orderBy(reservations.createdAt)
    return NextResponse.json({ reservations: result })
  } catch (error) {
    console.error("GET /api/reservations error:", error)
    return NextResponse.json({ error: "Failed to fetch reservations", details: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, hotelId, checkin, checkout, adults, children } = body

    if (!leadId || !hotelId || !checkin || !checkout) {
      return NextResponse.json({ error: "Missing required fields: leadId, hotelId, checkin, checkout" }, { status: 400 })
    }

    const [reservation] = await db.insert(reservations).values({
      leadId,
      hotelId,
      checkin: new Date(checkin),
      checkout: new Date(checkout),
      adults: adults || 1,
      children: children || 0,
      status: "pending",
    }).returning()

    return NextResponse.json({ reservation }, { status: 201 })
  } catch (error) {
    console.error("POST /api/reservations error:", error)
    return NextResponse.json({ error: "Failed to create reservation", details: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, checkin, checkout, adults, children } = body

    if (!id) {
      return NextResponse.json({ error: "Missing reservation id" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (checkin !== undefined) updateData.checkin = new Date(checkin)
    if (checkout !== undefined) updateData.checkout = new Date(checkout)
    if (adults !== undefined) updateData.adults = adults
    if (children !== undefined) updateData.children = children

    await db.update(reservations).set(updateData).where(eq(reservations.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/reservations error:", error)
    return NextResponse.json({ error: "Failed to update reservation", details: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Missing reservation id" }, { status: 400 })
    }
    await db.delete(reservations).where(eq(reservations.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/reservations error:", error)
    return NextResponse.json({ error: "Failed to delete reservation", details: (error as Error).message }, { status: 500 })
  }
}
