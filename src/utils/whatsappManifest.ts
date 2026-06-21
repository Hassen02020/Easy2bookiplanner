/**
 * whatsappManifest.ts
 *
 * Générateur de bon de commande WhatsApp pour Easy2Book.
 * Transforme un lead qualifié en pré-facture professionnelle d'agence,
 * prête à être envoyée à l'équipe commerciale et au client.
 */

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
  remainingSlots?: number | null
  detectedCity?: string | null
  detectedRegion?: string | null
  aiSummary?: string
}

export function buildWhatsAppManifest(input: WhatsAppManifestInput): string {
  const location = [input.detectedCity, input.detectedRegion].filter(Boolean).join(" / ") || "Non détectée"
  const slotsText = input.remainingSlots && input.remainingSlots > 0
    ? `Places restantes : ${input.remainingSlots}`
    : "Stock en cours de vérification"

  return `🟢 NOUVEAU BON DE COMMANDE - EASY2BOOK

🔑 Référence : #E2B-2026-${input.leadId}
👤 Client : ${input.firstName} ${input.lastName}
📱 Téléphone : ${input.phone}
📧 Email : ${input.email}
📍 Localisation d'origine : ${location}

✈️ DÉTAILS DE LA DEMANDE :
--------------------------
• Type : ${input.serviceType}
• Destination : ${input.destination}
• Période souhaitée : ${input.period}
• Participants : ${input.participants}

💰 CADRAGE TARIFAIRE IA :
--------------------------
• Tarif affiché : ${input.calculatedPrice} TND (indicatif "À partir de")
• ${slotsText}

💬 CONTEXTE IA :
"${input.aiSummary || "Client intéressé par une offre Easy2Book"}"

⚠️ STATUT DE PAIEMENT - ACTION REQUISE :
--------------------------
⚠️ Pour valider définitivement ce dossier et bloquer vos places dans notre inventoire réel, un acompte de confirmation est requis. Un agent va vous transmettre nos coordonnées de paiement immédiat.

👇 PROCHAINES ÉTAPES :
1. Vérifier disponibilité
2. Envoyer lien de paiement sécurisé
3. Confirmer par email et WhatsApp

Bonjour l'équipe Easy2Book, je souhaite finaliser ma réservation et bloquer mon tarif !`
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodedMessage}`
}

export function buildPaymentReminderMessage(
  firstName: string,
  destination: string,
  calculatedPrice: string,
  remainingSlots?: number | null
): string {
  const slotsText = remainingSlots && remainingSlots > 0
    ? `Il ne reste que ${remainingSlots} place(s) disponible(s).`
    : ""

  return (
    `Bonjour ${firstName},\n\n` +
    `Votre demande pour ${destination} est prête.\n` +
    `Tarif estimé : ${calculatedPrice} TND.\n` +
    `${slotsText ? `${slotsText}\n` : ""}` +
    `Pour bloquer définitivement votre dossier, un acompte de confirmation est nécessaire.\n\n` +
    `Un conseiller Easy2Book va vous envoyer le lien de paiement sécurisé.\n\n` +
    `Merci de votre confiance !`
  )
}
