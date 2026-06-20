import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  numeric,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"

export const languageEnum = pgEnum("language", ["fr", "ar", "en"])
export const serviceTypeEnum = pgEnum("service_type", ["hotel", "flight", "trip"])
export const leadStatusEnum = pgEnum("lead_status", [
  "pending",
  "converted_lead",
  "redirected_whatsapp",
])

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }).unique(),
    metaFbp: varchar("meta_fbp", { length: 255 }),
    metaFbc: varchar("meta_fbc", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    phoneIdx: index("users_phone_idx").on(table.phone),
  })
)

export const hotels = pgTable(
  "hotels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stars: integer("stars").notNull(),
    basePricePerNight: numeric("base_price_per_night", { precision: 10, scale: 2 }).notNull(),
    destination: varchar("destination", { length: 255 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    destinationIdx: index("hotels_destination_idx").on(table.destination),
    activeIdx: index("hotels_active_idx").on(table.isActive),
  })
)

export const hotelTranslations = pgTable(
  "hotel_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hotelId: uuid("hotel_id")
      .references(() => hotels.id, { onDelete: "cascade" })
      .notNull(),
    language: languageEnum("language").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    amenitiesTranslated: jsonb("amenities_translated"),
  },
  (table) => ({
    hotelLangUniqueIdx: uniqueIndex("hotel_translations_hotel_lang_unique_idx").on(
      table.hotelId,
      table.language
    ),
  })
)

export const organizedTrips = pgTable(
  "organized_trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    departureDate: timestamp("departure_date", { withTimezone: true }).notNull(),
    returnDate: timestamp("return_date", { withTimezone: true }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    availableSeats: integer("available_seats").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
)

export const organizedTripTranslations = pgTable(
  "organized_trip_translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .references(() => organizedTrips.id, { onDelete: "cascade" })
      .notNull(),
    language: languageEnum("language").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    includedServices: jsonb("included_services"),
  },
  (table) => ({
    tripLangUniqueIdx: uniqueIndex("organized_trip_translations_trip_lang_unique_idx").on(
      table.tripId,
      table.language
    ),
  })
)

export const flights = pgTable(
  "flights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    airline: varchar("airline", { length: 255 }).notNull(),
    departureAirport: varchar("departure_airport", { length: 255 }).notNull(),
    arrivalAirport: varchar("arrival_airport", { length: 255 }).notNull(),
    departureTime: timestamp("departure_time", { withTimezone: true }).notNull(),
    arrivalTime: timestamp("arrival_time", { withTimezone: true }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    departureIdx: index("flights_departure_idx").on(table.departureAirport),
    arrivalIdx: index("flights_arrival_idx").on(table.arrivalAirport),
  })
)

export const ruleTypeEnum = pgEnum("rule_type", [
  "markup_percentage",
  "discount_fixed",
  "override",
])

export const pricingRules = pgTable(
  "pricing_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: varchar("category", { length: 50 }).notNull(),
    destination: varchar("destination", { length: 100 }),
    ruleType: ruleTypeEnum("rule_type").notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    categoryIdx: index("pricing_rules_category_idx").on(table.category),
    destinationIdx: index("pricing_rules_destination_idx").on(table.destination),
    ruleTypeIdx: index("pricing_rules_rule_type_idx").on(table.ruleType),
    activeIdx: index("pricing_rules_active_idx").on(table.isActive),
  })
)

export const leadRequests = pgTable(
  "lead_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionToken: varchar("session_token", { length: 255 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    serviceType: serviceTypeEnum("service_type").notNull(),
    serviceId: uuid("service_id"),
    aiSummary: text("ai_summary"),
    status: leadStatusEnum("status").default("pending").notNull(),
    clientIp: varchar("client_ip", { length: 45 }),
    clientUserAgent: text("client_user_agent"),
    detectedCity: varchar("detected_city", { length: 255 }),
    detectedRegion: varchar("detected_region", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index("lead_requests_session_idx").on(table.sessionToken),
    userIdx: index("lead_requests_user_idx").on(table.userId),
    statusIdx: index("lead_requests_status_idx").on(table.status),
    ipIdx: index("lead_requests_ip_idx").on(table.clientIp),
    geoIdx: index("lead_requests_geo_idx").on(table.detectedCity, table.detectedRegion),
  })
)
