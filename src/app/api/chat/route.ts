import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { chatRequestSchema, searchHotelsSchema, searchTripsSchema } from "@/lib/ai/tools"
import { searchHotels, searchTrips } from "@/lib/db/search"
import { formatIndicativePrice } from "@/lib/pricing"
import { getTelemetryData } from "@/lib/telemetry"
import { getSessionUsage, incrementSessionUsage } from "@/lib/services/sessionLimiter"

async function getGemini() {
  const { GoogleGenerativeAI } = await import("@google/generative-ai")
  return new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "")
}

export async function POST(request: NextRequest) {
  try {
    const body = chatRequestSchema.parse(await request.json())
    const { messages, lang } = body

    const sessionUsage = await getSessionUsage()
    if (sessionUsage.triggerPaywall) {
      return NextResponse.json({
        content: "Vous avez atteint votre limite de 3 messages gratuits. Débloquez l'accès complet pour continuer avec un conseiller Easy2Book.",
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

    const genAI = await getGemini()
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    })

    // Convertir les messages OpenAI vers Gemini
    // Gemini exige que le premier message soit 'user', on filtre les messages 'model' initiaux
    const history = messages
      .map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }))
      .filter((m, i) => !(m.role === "model" && i === 0))

    // Dernier message utilisateur
    const lastMessage = messages[messages.length - 1]
    const previousHistory = history.slice(0, -1)

    const chat = model.startChat({ history: previousHistory })
    const result = await chat.sendMessage(lastMessage.content)
    const response = await result.response
    const responseText = response.text()

    // Vérifier si l'IA veut faire une recherche d'hôtels ou trips
    const hotelMatch = responseText.match(/searchHotels?:\s*(.+)/i)
    const tripMatch = responseText.match(/searchTrips?:\s*(.+)/i)

    if (hotelMatch) {
      const destination = hotelMatch[1].trim()
      const hotels = await searchHotels(destination, lang)
      const searchResults = hotels.map((hotel) => ({
        id: hotel.id,
        name: hotel.name,
        destination: hotel.destination,
        stars: hotel.stars,
        price: formatIndicativePrice(hotel.displayPrice),
        description: hotel.description,
        amenities: hotel.amenities,
      }))

      // Deuxième appel avec les résultats
      const result2 = await chat.sendMessage(
        `Voici les hôtels trouvés: ${JSON.stringify(searchResults)}. Recommande les meilleurs à l'utilisateur en français.`
      )
      const response2 = await result2.response

      return NextResponse.json({
        content: response2.text(),
        lang,
        telemetry,
        results: searchResults,
      })
    }

    if (tripMatch) {
      const destination = tripMatch[1].trim()
      const trips = await searchTrips(destination, lang)
      const searchResults = trips.map((trip) => ({
        id: trip.id,
        title: trip.title,
        departureDate: trip.departureDate,
        returnDate: trip.returnDate,
        price: formatIndicativePrice(trip.displayPrice),
        availableSeats: trip.availableSeats,
        description: trip.description,
        includedServices: trip.includedServices,
      }))

      const result2 = await chat.sendMessage(
        `Voici les voyages trouvés: ${JSON.stringify(searchResults)}. Recommande les meilleurs à l'utilisateur en français.`
      )
      const response2 = await result2.response

      return NextResponse.json({
        content: response2.text(),
        lang,
        telemetry,
        results: searchResults,
      })
    }

    return NextResponse.json({
      content: responseText,
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
