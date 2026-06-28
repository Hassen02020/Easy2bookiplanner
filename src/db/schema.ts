import { sql } from "drizzle-orm"
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
  check,
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

export const packageInventory = pgTable(
  "package_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packageName: varchar("package_name", { length: 255 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    destination: varchar("destination", { length: 100 }),
    totalSlots: integer("total_slots").notNull(),
    bookedSlots: integer("booked_slots").default(0).notNull(),
    thresholdUrgency: integer("threshold_urgency").default(3).notNull(),
    isSoldOut: boolean("is_sold_out").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    categoryIdx: index("package_inventory_category_idx").on(table.category),
    destinationIdx: index("package_inventory_destination_idx").on(table.destination),
    soldOutIdx: index("package_inventory_sold_out_idx").on(table.isSoldOut),
    bookedSlotsCheck: check("package_inventory_booked_slots_check", sql`${table.bookedSlots} <= ${table.totalSlots}`),
  })
)

export const aiMarketTrends = pgTable(
  "ai_market_trends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    detectedDestination: varchar("detected_destination", { length: 100 }),
    detectedCategory: varchar("detected_category", { length: 50 }),
    budgetMention: varchar("budget_mention", { length: 50 }),
    rawKeywords: text("raw_keywords").array(),
    detectedLanguage: varchar("detected_language", { length: 50 }),
    requestedDates: varchar("requested_dates", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sessionIdx: index("ai_market_trends_session_idx").on(table.sessionId),
    destinationIdx: index("ai_market_trends_destination_idx").on(table.detectedDestination),
    categoryIdx: index("ai_market_trends_category_idx").on(table.detectedCategory),
    createdAtIdx: index("ai_market_trends_created_at_idx").on(table.createdAt),
  })
)

export const clientTrips = pgTable(
  "client_trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: varchar("session_id", { length: 255 }).notNull(),
    destination: varchar("destination", { length: 100 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    subtitle: varchar("subtitle", { length: 255 }),
    itinerary: jsonb("itinerary").notNull(),
    totalEstimatedCost: varchar("total_estimated_cost", { length: 50 }),
    valueForMoneyScore: integer("value_for_money_score"),
    calculatedPrice: numeric("calculated_price", { precision: 10, scale: 2 }),
    status: varchar("status", { length: 50 }).default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    sessionIdx: index("client_trips_session_idx").on(table.sessionId),
    destinationIdx: index("client_trips_destination_idx").on(table.destination),
    statusIdx: index("client_trips_status_idx").on(table.status),
  })
)

export const userWallets = pgTable(
  "user_wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userPhone: varchar("user_phone", { length: 50 }).notNull().unique(),
    ecoCredits: integer("eco_credits").default(0).notNull(),
    membershipStatus: varchar("membership_status", { length: 20 }).default("free").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    phoneIdx: index("user_wallets_phone_idx").on(table.userPhone),
    statusIdx: index("user_wallets_status_idx").on(table.membershipStatus),
  })
)

export const tripTypeEnum = pgEnum("trip_type", ["mice", "medical", "event", "leisure"])

export const airportCodeEnum = pgEnum("airport_code", ["TUN", "NBE", "MIR"])

export const inboundTrips = pgTable(
  "inbound_trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientTripId: uuid("client_trip_id").references(() => clientTrips.id),
    userPassportName: varchar("user_passport_name", { length: 255 }).notNull(),
    countryOrigin: varchar("country_origin", { length: 100 }),
    flightNumber: varchar("flight_number", { length: 50 }),
    arrivalTime: timestamp("arrival_time", { withTimezone: true }),
    departureTime: timestamp("departure_time", { withTimezone: true }),
    airportCode: airportCodeEnum("airport_code"),
    assignedDriverId: varchar("assigned_driver_id", { length: 255 }),
    securityPin: varchar("security_pin", { length: 10 }).notNull(),
    tripType: tripTypeEnum("trip_type").default("leisure").notNull(),
    language: varchar("language", { length: 20 }).default("en").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    clientTripIdx: index("inbound_trips_client_trip_idx").on(table.clientTripId),
    tripTypeIdx: index("inbound_trips_type_idx").on(table.tripType),
    arrivalIdx: index("inbound_trips_arrival_idx").on(table.arrivalTime),
  })
)

export const eventTypeEnum = pgEnum("event_type", ["seminar", "wedding", "conference"])

export const corporateEvents = pgTable(
  "corporate_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    eventType: eventTypeEnum("event_type").notNull(),
    totalAttendees: integer("total_attendees").notNull(),
    allocatedBudget: numeric("allocated_budget", { precision: 12, scale: 2 }),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => ({
    companyIdx: index("corporate_events_company_idx").on(table.companyName),
    eventTypeIdx: index("corporate_events_type_idx").on(table.eventType),
    datesIdx: index("corporate_events_dates_idx").on(table.startDate, table.endDate),
  })
)

export const reservationStatusEnum = pgEnum("reservation_status", ["pending", "confirmed", "cancelled"])

export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hotelId: uuid("hotel_id").references(() => hotels.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    promoPrice: numeric("promo_price", { precision: 10, scale: 2 }).notNull(),
    bookingStart: timestamp("booking_start", { withTimezone: true }),
    bookingEnd: timestamp("booking_end", { withTimezone: true }),
    travelStart: timestamp("travel_start", { withTimezone: true }),
    travelEnd: timestamp("travel_end", { withTimezone: true }),
    childPolicy: text("child_policy"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    hotelIdx: index("promotions_hotel_idx").on(table.hotelId),
    activeIdx: index("promotions_active_idx").on(table.isActive),
  })
)

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullname: varchar("fullname", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }),
    city: varchar("city", { length: 255 }),
    source: varchar("source", { length: 50 }).default("Website").notNull(),
    marketingConsent: boolean("marketing_consent").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    phoneIdx: index("leads_phone_idx").on(table.phone),
    sourceIdx: index("leads_source_idx").on(table.source),
  })
)

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    userMessage: text("user_message").notNull(),
    botResponse: text("bot_response").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    leadIdx: index("conversations_lead_idx").on(table.leadId),
    createdAtIdx: index("conversations_created_at_idx").on(table.createdAt),
  })
)

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "cascade" }),
    hotelId: uuid("hotel_id").references(() => hotels.id, { onDelete: "cascade" }),
    checkin: timestamp("checkin", { withTimezone: true }).notNull(),
    checkout: timestamp("checkout", { withTimezone: true }).notNull(),
    adults: integer("adults").default(1).notNull(),
    children: integer("children").default(0).notNull(),
    status: reservationStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    leadIdx: index("reservations_lead_idx").on(table.leadId),
    hotelIdx: index("reservations_hotel_idx").on(table.hotelId),
    statusIdx: index("reservations_status_idx").on(table.status),
  })
)
