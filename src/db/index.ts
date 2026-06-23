import { Pool, neonConfig } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-serverless"
import * as schema from "./schema"
import ws from "ws"

if (typeof neonConfig !== "undefined") {
  neonConfig.webSocketConstructor = ws
}

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null
let pool: Pool | null = null

function getDb() {
  if (!dbInstance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is missing")
    }
    pool = new Pool({ connectionString })
    dbInstance = drizzle(pool, { schema })
  }
  return dbInstance
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const value = Reflect.get(getDb(), prop)
    // Les méthodes Drizzle (transaction, select, etc.) doivent être liées au vrai client
    // pour conserver le bon contexte `this` et éviter les bugs de transaction.
    if (typeof value === "function") {
      return value.bind(getDb())
    }
    return value
  },
})

export async function closeDbPool() {
  if (pool) {
    await pool.end()
    pool = null
    dbInstance = null
  }
}
