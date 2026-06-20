export interface WhatsAppManifestInput {
  leadId: string
  firstName: string
  lastName: string
  phone: string
  email: string
  serviceType: string
  destination: string
  period: string
  participants: string
  calculatedPrice: string
  detectedCity: string | null
  detectedRegion: string | null
  aiSummary: string
}

export function buildWhatsAppManifest(input: WhatsAppManifestInput): string {
  const location = [input.detectedCity, input.detectedRegion].filter(Boolean).join(" / ") || "Non détectée"

  return `🟢 NOUVEAU LEAD QUALIFIÉ - EASY2BOOK TRAVEL PLANNER
🔑 Référence Lead : #E2B-2026-${input.leadId}
👤 Client : ${input.firstName} ${input.lastName}
📱 Téléphone : ${input.phone}
📧 Email : ${input.email}

✈️ DEMANDE DE VOYAGE :
--------------------------
• Type : ${input.serviceType}
• Destination : ${input.destination}
• Période souhaitée : ${input.period}
• Participants : ${input.participants}

💰 CADRAGE TARIFAIRE IA :
--------------------------
• Prix affiché par l'IA : ${input.calculatedPrice} TND (Tarif Indicatif "À partir de")
📍 Localisation d'origine : ${location}

💬 Note Contexte IA : "${input.aiSummary}"
--------------------------
Bonjour l'équipe Easy2Book, je souhaite finaliser ma réservation et valider mon devis définitif avec un conseiller !`
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodedMessage}`
}
