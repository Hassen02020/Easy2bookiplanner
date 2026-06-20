import { headers } from "next/headers"
import { randomUUID } from "crypto"

export interface TelemetryData {
  ip: string
  userAgent: string
  city: string | null
  region: string | null
  country: string | null
  fbp: string | null
  fbc: string | null
}

export async function getTelemetryData(): Promise<TelemetryData> {
  const headersList = await headers()

  const forwardedFor = headersList.get("x-forwarded-for")
  const ip = forwardedFor?.split(",")[0]?.trim() || headersList.get("x-real-ip") || "0.0.0.0"

  const userAgent = headersList.get("user-agent") || ""
  const city = headersList.get("x-vercel-ip-city") || headersList.get("x-city") || null
  const region = headersList.get("x-vercel-ip-country-region") || headersList.get("x-region") || null
  const country = headersList.get("x-vercel-ip-country") || headersList.get("x-country") || null

  const cookieHeader = headersList.get("cookie") || ""
  const fbp = extractCookieValue(cookieHeader, "_fbp")
  const fbc = extractCookieValue(cookieHeader, "_fbc")

  return {
    ip,
    userAgent,
    city: city ? decodeURIComponent(city) : null,
    region: region ? decodeURIComponent(region) : null,
    country: country ? decodeURIComponent(country) : null,
    fbp,
    fbc,
  }
}

function extractCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match?.[1] || null
}

export function generateSessionToken(): string {
  return `e2b_${randomUUID()}`
}
