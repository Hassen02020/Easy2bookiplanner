import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { chatRequestSchema } from "@/lib/ai/tools"
import { getTelemetryData } from "@/lib/telemetry"
import { getSessionUsage, incrementSessionUsage } from "@/lib/services/sessionLimiter"
import { GoogleGenAI } from "@google/genai"

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

    const ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
    })

    const lastMessage = messages[messages.length - 1]
    const userMessage = lastMessage?.content || ""

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
Tu es Easy2Book Assistant, un conseiller de voyage expert pour la Tunisie.

Règles :
- Réponds en arabe ou français selon la langue du client
- Tu aides pour hôtels en Tunisie, voyages organisés, omra, et circuits
- Propose offres et promotions quand pertinent
- Sois court, professionnel et amical
- Termine toujours avec :
📞 Easy2Book : +216 98140514

Historique de la conversation :
${messages.slice(-6).map((m: { role: string; content: string }) => `${m.role === "assistant" ? "Assistant" : "Client"}: ${m.content}`).join("\n")}

Question client :
${userMessage}
`,
    })

    return NextResponse.json({
      content: response.text,
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
