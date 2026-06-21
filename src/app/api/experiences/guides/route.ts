import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { findGuidesByZone } from "@/lib/services/guidesService"

/**
 * GET /api/experiences/guides?zone=Beni+Mtir
 *
 * API d'allocation des guides locaux et micro-expériences Easy2Book.
 * Retourne les guides et activités disponibles pour une zone géographique donnée.
 *
 * Le catalogue est géré dans `src/lib/services/guidesService.ts` et pourra
 * évoluer vers une table `local_experiences` en base de données.
 */

const requestSchema = z.object({
  zone: z.string().min(1),
  category: z.enum(["randonnée", "culture", "gastronomie", "aventure", "tous"]).optional().default("tous"),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const rawZone = searchParams.get("zone")
    const rawCategory = searchParams.get("category")

    const validated = requestSchema.parse({
      zone: rawZone,
      category: rawCategory || "tous",
    })

    const guides = findGuidesByZone(validated.zone, validated.category)

    return NextResponse.json({
      zone: validated.zone,
      category: validated.category,
      count: guides.length,
      guides,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Paramètres invalides", details: error.errors }, { status: 400 })
    }

    console.error("[guides] error:", error)
    return NextResponse.json(
      { error: "Échec de récupération des guides locaux.", details: (error as Error).message },
      { status: 500 }
    )
  }
}
