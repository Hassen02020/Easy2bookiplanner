import { NextResponse } from "next/server"
import { runDynamicPricing } from "@/lib/services/dynamicPricingService"

/**
 * POST /api/admin/run-dynamic-pricing
 *
 * Point d'accès pour exécuter la tarification dynamique prédictive.
 * À appeler par un cron job toutes les 6 heures (Vercel Cron, GitHub Actions, etc.)
 * ou manuellement depuis le tableau de bord admin.
 */

export async function POST() {
  try {
    const applied = await runDynamicPricing()

    return NextResponse.json({
      success: true,
      applied,
      message:
        applied.length > 0
          ? `Markup dynamique appliqué sur ${applied.length} destination(s).`
          : "Aucune surdemande détectée.",
    })
  } catch (error) {
    console.error("[run-dynamic-pricing] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Échec de l'exécution de la tarification dynamique.",
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
