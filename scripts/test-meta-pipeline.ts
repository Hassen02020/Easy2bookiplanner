import { createHash } from "crypto"
import { normalizePhone } from "../src/lib/phone"

const testCases = [
  { input: "00216 98 123 456", expected: "+21698123456" },
  { input: "+21622334455", expected: "+21622334455" },
  { input: "98123456", expected: "+21698123456" },
  { input: "22334455", expected: "+21622334455" },
  { input: "00216 21 234 567", expected: "+21621234567" },
]

function sha256(value: string | undefined): string | undefined {
  if (!value) return undefined
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex")
}

function sha256Phone(value: string | undefined): string | undefined {
  if (!value) return undefined
  return sha256(normalizePhone(value))
}

function buildCapiPayload(event: {
  eventName: string
  eventId: string
  value: number
  currency: string
  phone: string
  email?: string
  firstName?: string
  lastName?: string
}) {
  return {
    data: [
      {
        event_name: event.eventName,
        event_id: event.eventId,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: {
          ph: sha256Phone(event.phone),
          em: sha256(event.email),
          fn: sha256(event.firstName),
          ln: sha256(event.lastName),
        },
        custom_data: {
          value: event.value,
          currency: event.currency,
        },
      },
    ],
  }
}

function main() {
  console.log("[test-meta-pipeline] Validating phone normalization...")
  let allNormalized = true
  for (const { input, expected } of testCases) {
    const normalized = normalizePhone(input)
    const status = normalized === expected ? "PASS" : "FAIL"
    if (normalized !== expected) allNormalized = false
    console.log(`  ${status}: "${input}" -> "${normalized}" (expected "${expected}")`)
  }

  if (!allNormalized) {
    throw new Error("Phone normalization failed for one or more inputs.")
  }

  console.log("[test-meta-pipeline] Validating CAPI payload hash determinism...")
  const phone = "00216 98 123 456"
  const normalized = normalizePhone(phone)
  const expectedHash = sha256(normalized)
  const actualHash = sha256Phone(phone)
  const expectedEventId = "e2b_test_123"

  const payload = buildCapiPayload({
    eventName: "InitiateCheckout",
    eventId: expectedEventId,
    value: 2450.0,
    currency: "TND",
    phone,
    email: "Test@Example.com",
    firstName: "Ahmed",
    lastName: "Ben",
  })

  const event = payload.data[0]

  console.log("  Generated CAPI payload event:")
  console.log(`    event_name: ${event.event_name}`)
  console.log(`    event_id: ${event.event_id}`)
  console.log(`    action_source: ${event.action_source}`)
  console.log(`    user_data.ph: ${event.user_data.ph}`)
  console.log(`    user_data.em: ${event.user_data.em}`)
  console.log(`    custom_data.value: ${event.custom_data.value}`)
  console.log(`    custom_data.currency: ${event.custom_data.currency}`)

  if (event.event_id !== expectedEventId) {
    throw new Error(`event_id mismatch: ${event.event_id}`)
  }
  if (event.event_name !== "InitiateCheckout") {
    throw new Error(`event_name mismatch: ${event.event_name}`)
  }
  if (event.user_data.ph !== expectedHash) {
    throw new Error(
      `phone hash mismatch: ${event.user_data.ph} !== ${expectedHash}`
    )
  }
  if (event.user_data.em !== sha256("test@example.com")) {
    throw new Error("email hash mismatch")
  }
  if (event.custom_data.currency !== "TND") {
    throw new Error("currency must be TND")
  }
  if (event.custom_data.value <= 0) {
    throw new Error("value must be positive and real")
  }

  console.log(
    "[test-meta-pipeline] PASS: phone normalized to E.164, hash deterministic, payload valid."
  )
}

main()
