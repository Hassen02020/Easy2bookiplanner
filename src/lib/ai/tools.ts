import { z } from "zod"
import { SupportedLanguage } from "@/lib/db/search"

export const searchHotelsSchema = z.object({
  destination: z.string().describe("Destination requested by the user, e.g. Hammamet, Sousse, Djerba"),
  stars: z.number().min(1).max(5).optional().describe("Minimum star rating if the user specified it"),
})

export const searchTripsSchema = z.object({
  destination: z.string().describe("Destination or package name, e.g. Istanbul, Omra, Cap Verde"),
  type: z.enum(["organized", "omra", "cruise", "beach"]).optional().describe("Trip category if mentioned"),
})

export interface ChatRequest {
  messages: { role: "system" | "user" | "assistant"; content: string }[]
  lang: SupportedLanguage
}

export const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  lang: z.enum(["fr", "ar", "en"]).default("fr"),
})
