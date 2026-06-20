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
  return /^\+216\d{8}$/.test(e164)
}

export function normalizePhone(phone: string): string {
  return formatToE164(phone, "216")
}
