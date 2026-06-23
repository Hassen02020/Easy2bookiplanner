export interface MetaEventPayload {
  eventName: "PageView" | "Lead" | "InitiateCheckout" | "Purchase"
  eventId: string
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  region?: string
  country?: string
  value?: number
  currency?: string
  contentName?: string
  contentCategory?: string
}

export function trackClientPixel(event: MetaEventPayload) {
  if (typeof window === "undefined" || !(window as any).fbq) {
    return
  }

  const fbq = (window as any).fbq as (...args: unknown[]) => void
  fbq(
    "track",
    event.eventName,
    {
      content_name: event.contentName,
      content_category: event.contentCategory,
      value: event.value,
      currency: event.currency || "TND",
      // Données utilisateur pour l'Advanced Matching (le pixel hache côté Meta)
      em: event.email,
      ph: event.phone,
      fn: event.firstName,
      ln: event.lastName,
      ct: event.city,
      st: event.region,
      country: event.country,
    },
    { eventID: event.eventId }
  )
}

export async function sendServerCapiEvent(event: MetaEventPayload) {
  const response = await fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...event,
      fbp: getCookie("_fbp") || undefined,
      fbc: getCookie("_fbc") || undefined,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to send Meta CAPI event")
  }

  return response.json()
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match?.[1] || null
}

export function generateEventId(): string {
  return `e2b_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}
