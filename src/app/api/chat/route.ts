import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { chatRequestSchema, searchHotelsSchema, searchTripsSchema } from "@/lib/ai/tools"
import { searchHotels, searchTrips } from "@/lib/db/search"
import { formatIndicativePrice } from "@/lib/pricing"
import { getTelemetryData } from "@/lib/telemetry"
import { getSessionUsage, incrementSessionUsage } from "@/lib/services/sessionLimiter"

async function getOpenAI() {
  const { default: OpenAI } = await import("openai")
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
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

    const response = await (await getOpenAI()).chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "searchHotels",
            description: "Search available hotels in Tunisian destinations by city and minimum stars",
            parameters: {
              type: "object",
              properties: {
                destination: { type: "string" },
                stars: { type: "number", minimum: 1, maximum: 5 },
              },
              required: ["destination"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "searchTrips",
            description: "Search organized trips and packages such as Istanbul, Omra, or beach destinations",
            parameters: {
              type: "object",
              properties: {
                destination: { type: "string" },
                type: { type: "string", enum: ["organized", "omra", "cruise", "beach"] },
              },
              required: ["destination"],
            },
          },
        },
      ],
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 1500,
    })

    const assistantMessage = response.choices[0]?.message

    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall) => {
          const name = toolCall.function.name
          const args = JSON.parse(toolCall.function.arguments)

          if (name === "searchHotels") {
            const parsed = searchHotelsSchema.parse(args)
            const hotels = await searchHotels(parsed.destination, lang, parsed.stars)
            return {
              tool_call_id: toolCall.id,
              role: "tool" as const,
              content: JSON.stringify(
                hotels.map((hotel) => ({
                  id: hotel.id,
                  name: hotel.name,
                  destination: hotel.destination,
                  stars: hotel.stars,
                  price: formatIndicativePrice(hotel.displayPrice),
                  description: hotel.description,
                  amenities: hotel.amenities,
                }))
              ),
            }
          }

          if (name === "searchTrips") {
            const parsed = searchTripsSchema.parse(args)
            const trips = await searchTrips(parsed.destination, lang, parsed.type)
            return {
              tool_call_id: toolCall.id,
              role: "tool" as const,
              content: JSON.stringify(
                trips.map((trip) => ({
                  id: trip.id,
                  title: trip.title,
                  departureDate: trip.departureDate,
                  returnDate: trip.returnDate,
                  price: formatIndicativePrice(trip.displayPrice),
                  availableSeats: trip.availableSeats,
                  description: trip.description,
                  includedServices: trip.includedServices,
                }))
              ),
            }
          }

          return {
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: JSON.stringify({ error: "Unknown tool" }),
          }
        })
      )

      const finalResponse = await (await getOpenAI()).chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          assistantMessage,
          ...toolResults,
        ],
        temperature: 0.7,
        max_tokens: 1500,
      })

      const searchResults = toolResults
        .map((result) => {
          try {
            return JSON.parse(result.content)
          } catch {
            return null
          }
        })
        .flat()
        .filter(Boolean)

      return NextResponse.json({
        content: finalResponse.choices[0]?.message?.content,
        lang,
        telemetry,
        results: searchResults,
      })
    }

    return NextResponse.json({
      content: assistantMessage?.content,
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
