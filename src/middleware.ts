import { NextRequest, NextResponse } from "next/server"

/**
 * middleware.ts
 *
 * Middleware global de sécurité pour Easy2Book.
 * - Applique des en-têtes de sécurité sur toutes les réponses.
 * - Implémente un rate limiting basique par IP sur les routes coûteuses en tokens OpenAI.
 *
 * Note : la route webhook Facebook (/api/webhooks/facebook-leads) est exclue du matcher
 * car la validation de signature est gérée de manière autonome dans le route handler.
 */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|api/webhooks/facebook-leads$).*)",
  ],
}

// En-têtes de sécurité de base
const securityHeaders = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
}

// Rate limiting basique par IP (in-memory, adapté à un déploiement à faible trafic).
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requêtes par minute par IP

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count += 1
  return entry.count > RATE_LIMIT_MAX_REQUESTS
}

function isVoiceChatRequest(pathname: string): boolean {
  return pathname === "/api/chat/voice" || pathname === "/api/chat/voice-to-text"
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname

  // Rate limiting sur les routes vocales (coût OpenAI élevé).
  if (isVoiceChatRequest(pathname) && request.method === "POST") {
    const ip = getClientIp(request)

    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer dans une minute." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      )
    }
  }

  // Réponse par défaut avec en-têtes de sécurité.
  const response = NextResponse.next()
  return applySecurityHeaders(response)
}
