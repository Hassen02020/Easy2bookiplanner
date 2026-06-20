import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/chat/voice
 *
 * Route serveur Next.js 15 pour traiter les messages vocaux envoyés par le client.
 * 1. Reçoit un blob audio via FormData.
 * 2. Valide la taille du fichier.
 * 3. Transcrit l'audio avec OpenAI Whisper.
 * 4. Passe le texte transcrit à GPT-4o avec un prompt système adapté au marché tunisien.
 * 5. Retourne un JSON contenant la transcription et la réponse de l'assistant.
 */

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 Mo, limite OpenAI Whisper

async function getOpenAI() {
  const { default: OpenAI } = await import("openai")
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
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

function buildTravelConciergePrompt(): string {
  return `Tu es un concierge de voyage tunisien expert pour Easy2Book. Tu aides les clients en français, anglais ou en darja tunisienne (arabe dialectal, souvent écrit en latin ou en arabe).

Règles strictes :
- Ne jamais garantir un prix final. Utilise uniquement des formulations comme "À partir de", "Tarif indicatif", "à partir de".
- Tous les prix sont en dinars tunisiens (TND).
- Les remises et offres définitives sont validées uniquement par l'équipe commerciale sur WhatsApp.
- Propose des hôtels, voyages organisés (Istanbul, Turquie, Cap-Vert, etc.) et séjours Omra selon la demande.
- Sois chaleureux, persuasif et concis. Formate ta réponse avec des puces claires.

Si la demande mentionne un prix, une destination, ou un type de voyage, invite poliment le client à finaliser sa demande pour recevoir un devis personnalisé.`
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File | null

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: "Aucun fichier audio fourni." }, { status: 400 })
    }

    if (audioFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Fichier audio trop volumineux. Limite : 25 Mo." },
        { status: 413 }
      )
    }

    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const extension = getAudioExtension(audioFile.type)
    const filename = `voice_${Date.now()}.${extension}`

    const openai = await getOpenAI()

    // Étape 1 : Transcription Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: new File([buffer], filename, { type: audioFile.type || "audio/webm" }),
      model: "whisper-1",
      language: "auto",
      response_format: "json",
    })

    const transcribedText = transcription.text?.trim()

    if (!transcribedText) {
      return NextResponse.json(
        { error: "Impossible de transcrire l'audio." },
        { status: 422 }
      )
    }

    // Étape 2 : Analyse contextuelle avec GPT-4o
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: buildTravelConciergePrompt() },
        { role: "user", content: transcribedText },
      ],
      temperature: 0.7,
      max_tokens: 800,
    })

    const assistantResponse = completion.choices[0]?.message?.content?.trim() || ""

    return NextResponse.json({
      transcription: transcribedText,
      response: assistantResponse,
      metadata: {
        filename,
        mimeType: audioFile.type,
        size: audioFile.size,
      },
    })
  } catch (error) {
    console.error("Voice route error:", error)
    return NextResponse.json(
      {
        error: "Échec du traitement du message vocal.",
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
