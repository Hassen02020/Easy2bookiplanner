import dotenv from "dotenv"
import path from "path"
import { db, closeDbPool } from "../src/db"

dotenv.config({ path: path.resolve(__dirname, "../.env.local") })
import { packageInventory } from "../src/db/schema"
import { bookSlots, initializeInventory } from "../src/db/inventory"
import { eq } from "drizzle-orm"

const TEST_PACKAGE_NAME = "TEST-CONCURRENCY-INVENTORY"

async function setup(): Promise<string> {
  const existing = await db
    .select({ id: packageInventory.id })
    .from(packageInventory)
    .where(eq(packageInventory.packageName, TEST_PACKAGE_NAME))
    .limit(1)

  if (existing.length > 0) {
    await db.delete(packageInventory).where(eq(packageInventory.id, existing[0].id))
  }

  const id = await initializeInventory(
    TEST_PACKAGE_NAME,
    "test",
    "Tunisie",
    1, // 1 seule place disponible
    1
  )
  return id
}

async function cleanup(id: string) {
  await db.delete(packageInventory).where(eq(packageInventory.id, id))
  await closeDbPool()
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined. Add it to .env.local.")
  }

  console.log("[test-concurrency] Setup: creating test package with 1 slot...")
  const packageId = await setup()
  console.log(`[test-concurrency] Test package id: ${packageId}`)

  console.log("[test-concurrency] Launching 5 concurrent bookSlots requests...")
  const requests = Array.from({ length: 5 }, (_, i) =>
    bookSlots(packageId, 1).then((result) => ({ index: i + 1, result }))
  )
  const results = await Promise.all(requests)

  const successes = results.filter((r) => r.result.success)
  const failures = results.filter((r) => !r.result.success)

  console.log("[test-concurrency] Results:")
  for (const r of results) {
    console.log(
      `  Request #${r.index}: ${r.result.success ? "SUCCESS" : "FAILURE"} - remaining=${r.result.remaining} - ${r.result.message}`
    )
  }

  const final = await db
    .select({
      totalSlots: packageInventory.totalSlots,
      bookedSlots: packageInventory.bookedSlots,
      isSoldOut: packageInventory.isSoldOut,
    })
    .from(packageInventory)
    .where(eq(packageInventory.id, packageId))
    .limit(1)

  console.log("[test-concurrency] Final inventory state:", final[0])

  await cleanup(packageId)

  if (successes.length !== 1) {
    throw new Error(
      `Race condition detected: ${successes.length} bookings succeeded out of 5, expected exactly 1.`
    )
  }

  if (final[0].bookedSlots !== 1) {
    throw new Error(
      `Inventory corrupted: bookedSlots=${final[0].bookedSlots}, expected 1.`
    )
  }

  if (successes.length === 1 && failures.length === 4) {
    console.log(
      "[test-concurrency] PASS: pessimistic locking prevented overbooking."
    )
  }
}

main().catch((error) => {
  console.error("[test-concurrency] FAILED:", error)
  process.exit(1)
})
