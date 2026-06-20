const TUNISIAN_OPERATORS = new Set(["2", "3", "4", "5", "9"])

export function formatToE164(phone: string, countryCode: string = "216"): string {
  const digits = phone.replace(/\D/g, "")

  if (digits.startsWith("00")) {
    return `+${digits.slice(2)}`
  }

  if (digits.startsWith("+")) {
    return digits
  }

  if (digits.startsWith(countryCode)) {
    return `+${digits}`
  }

  return `+${countryCode}${digits}`
}

export function isValidTunisianPhone(phone: string): boolean {
  const e164 = formatToE164(phone)
  const match = /^\+216(\d)(\d{7})$/.exec(e164)
  if (!match) return false
  const operator = match[1]
  return TUNISIAN_OPERATORS.has(operator)
}

export function normalizePhone(phone: string): string {
  return formatToE164(phone, "216")
}

export const sanitizeTunisianPhone = normalizePhone

export function phoneErrorMessage(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 8) return "Numéro incomplet. 8 chiffres requis après l'indicatif +216."
  if (digits.length > 11) return "Numéro trop long."
  const local = digits.slice(-8)
  const operator = local[0]
  if (!TUNISIAN_OPERATORS.has(operator)) {
    return `Le numéro doit commencer par 2, 3, 4, 5 ou 9 (ex: +216 21 234 567).`
  }
  return "Numéro de téléphone tunisien invalide."
}
