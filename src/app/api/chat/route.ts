import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { chatRequestSchema } from "@/lib/ai/tools"
import { getTelemetryData } from "@/lib/telemetry"
import { getSessionUsage, incrementSessionUsage } from "@/lib/services/sessionLimiter"
import { google } from "@ai-sdk/google"
import { generateText } from "ai"

export async function POST(request: NextRequest) {
  try {
    const body = chatRequestSchema.parse(await request.json())
    const { messages, lang } = body

    const sessionUsage = await getSessionUsage()
    if (sessionUsage.triggerPaywall) {
      return NextResponse.json({
        content: "Vous avez atteint votre limite de messages gratuits. Débloquez l'accès complet pour continuer avec un conseiller Easy2Book.",
        lang,
        triggerPaywall: true,
        session: {
          messageCount: sessionUsage.messageCount,
          maxFreeMessages: sessionUsage.maxFreeMessages,
          remaining: 0,
        },
        telemetry: await getTelemetryData(),
      })
    }

    await incrementSessionUsage()

    const telemetry = await getTelemetryData()
    const systemPrompt = buildSystemPrompt(lang)

    const result = await generateText({
      model: google("gemini-2.0-flash"),
      system: systemPrompt,
      messages,
    })

    return NextResponse.json({
      content: result.text,
      lang,
      telemetry,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 })
    }

    console.error("Chat error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    )
  }
}
