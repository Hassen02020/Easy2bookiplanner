import { NextRequest, NextResponse } from "next/server"
import { getSessionUsage, incrementSessionUsage } from "@/lib/services/sessionLimiter"

async function getGemini() {
  const { GoogleGenerativeAI } = await import("@google/generative-ai")
  return new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "")
}

export async function POST(request: NextRequest) {
  try {
    const sessionUsage = await getSessionUsage()
    if (sessionUsage.triggerPaywall) {
      return NextResponse.json(
        {
          error: "Limite de messages gratuits atteinte. Débloquez l'accès complet pour continuer.",
          triggerPaywall: true,
        },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get("audio") as File | null

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Gemini audio transcription
    const genAI = await getGemini()
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    // Convertir le buffer en base64 pour Gemini
    const base64Audio = buffer.toString("base64")
    const mimeType = audioFile.type || "audio/webm"

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Audio,
          mimeType,
        },
      },
      "Transcris ce message audio en texte. Réponds uniquement avec le texte transcrit, sans aucun commentaire.",
    ])

    const response = await result.response
    const text = response.text().trim()

    return NextResponse.json({
      text,
      mimeType: audioFile.type,
    })
  } catch (error) {
    console.error("Voice-to-text error:", error)
    return NextResponse.json(
      { error: "Failed to transcribe audio", details: (error as Error).message },
      { status: 500 }
    )
  }
}

function getAudioExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase()
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/m4a": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/opus": "opus",
  }

  for (const [type, extension] of Object.entries(map)) {
    if (normalized.startsWith(type)) {
      return extension
    }
  }

  return "webm"
}
