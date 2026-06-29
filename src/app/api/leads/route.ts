import { NextRequest, NextResponse } from "next/server"
import { eq, ilike } from "drizzle-orm"
import { db } from "@/db"
import { leads, leadScores, conversations } from "@/db/schema"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")
    const source = searchParams.get("source")

    let query = db.select().from(leads)
    if (phone) {
      query = query.where(eq(leads.phone, phone)) as typeof query
    }
    if (source) {
      query = query.where(eq(leads.source, source)) as typeof query
    }

    const leadsList = await query.orderBy(leads.createdAt)

    const leadsWithData = await Promise.all(
      leadsList.map(async (lead) => {
        const scores = await db.select().from(leadScores).where(eq(leadScores.leadId, lead.id))
        const convos = await db.select().from(conversations).where(eq(conversations.leadId, lead.id))
        return {
          ...lead,
          score: scores[0]?.score || "cold",
          conversationCount: convos.length,
        }
      })
    )

    return NextResponse.json({ leads: leadsWithData })
  } catch (error) {
    console.error("GET /api/leads error:", error)
    return NextResponse.json({ error: "Failed to fetch leads", details: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fullname, phone, email, city, source, marketingConsent } = body

    if (!fullname || !phone) {
      return NextResponse.json({ error: "Missing required fields: fullname, phone" }, { status: 400 })
    }

    const [lead] = await db.insert(leads).values({
      fullname,
      phone,
      email: email || null,
      city: city || null,
      source: source || "Website",
      marketingConsent: marketingConsent || false,
    }).returning()

    await db.insert(leadScores).values({
      leadId: lead.id,
      score: "cold",
      reason: "New lead",
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error("POST /api/leads error:", error)
    return NextResponse.json({ error: "Failed to create lead", details: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, fullname, phone, email, city, marketingConsent, score, scoreReason } = body

    if (!id) {
      return NextResponse.json({ error: "Missing lead id" }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (fullname !== undefined) updateData.fullname = fullname
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (city !== undefined) updateData.city = city
    if (marketingConsent !== undefined) updateData.marketingConsent = marketingConsent

    if (Object.keys(updateData).length > 0) {
      await db.update(leads).set(updateData).where(eq(leads.id, id))
    }

    if (score) {
      const existing = await db.select().from(leadScores).where(eq(leadScores.leadId, id))
      if (existing.length > 0) {
        await db.update(leadScores).set({ score, reason: scoreReason || existing[0].reason }).where(eq(leadScores.leadId, id))
      } else {
        await db.insert(leadScores).values({ leadId: id, score, reason: scoreReason || "Updated" })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/leads error:", error)
    return NextResponse.json({ error: "Failed to update lead", details: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json({ error: "Missing lead id" }, { status: 400 })
    }
    await db.delete(leads).where(eq(leads.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/leads error:", error)
    return NextResponse.json({ error: "Failed to delete lead", details: (error as Error).message }, { status: 500 })
  }
}
