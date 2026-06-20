import { NextRequest, NextResponse } from "next/server"

async function getOpenAI() {
  const { default: OpenAI } = await import("openai")
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File | null

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const bytes = await audioFile.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const extension = getAudioExtension(audioFile.type)
    const filename = `recording.${extension}`

    const whisperFormData = new FormData()
    whisperFormData.append(
      "file",
      new Blob([buffer], { type: audioFile.type || "audio/webm" }),
      filename
    )
    whisperFormData.append("model", "whisper-1")
    whisperFormData.append("response_format", "json")
    whisperFormData.append("language", "auto")

    const response = await (await getOpenAI()).audio.transcriptions.create({
      file: new File([buffer], filename, { type: audioFile.type || "audio/webm" }),
      model: "whisper-1",
    })

    return NextResponse.json({
      text: response.text,
      mimeType: audioFile.type,
      filename,
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
