CREATE TYPE "public"."airport_code" AS ENUM('TUN', 'NBE', 'MIR');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('seminar', 'wedding', 'conference');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('fr', 'ar', 'en');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('pending', 'converted_lead', 'redirected_whatsapp');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('markup_percentage', 'discount_fixed', 'override');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('hotel', 'flight', 'trip');--> statement-breakpoint
CREATE TYPE "public"."trip_type" AS ENUM('mice', 'medical', 'event', 'leisure');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_market_trends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"detected_destination" varchar(100),
	"detected_category" varchar(50),
	"budget_mention" varchar(50),
	"raw_keywords" text[],
	"detected_language" varchar(50),
	"requested_dates" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"destination" varchar(100) NOT NULL,
	"category" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"subtitle" varchar(255),
	"itinerary" jsonb NOT NULL,
	"total_estimated_cost" varchar(50),
	"value_for_money_score" integer,
	"calculated_price" numeric(10, 2),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"event_type" "event_type" NOT NULL,
	"total_attendees" integer NOT NULL,
	"allocated_budget" numeric(12, 2),
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"airline" varchar(255) NOT NULL,
	"departure_airport" varchar(255) NOT NULL,
	"arrival_airport" varchar(255) NOT NULL,
	"departure_time" timestamp with time zone NOT NULL,
	"arrival_time" timestamp with time zone NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hotel_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"amenities_translated" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stars" integer NOT NULL,
	"base_price_per_night" numeric(10, 2) NOT NULL,
	"destination" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbound_trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_trip_id" uuid,
	"user_passport_name" varchar(255) NOT NULL,
	"country_origin" varchar(100),
	"flight_number" varchar(50),
	"arrival_time" timestamp with time zone,
	"departure_time" timestamp with time zone,
	"airport_code" "airport_code",
	"assigned_driver_id" varchar(255),
	"security_pin" varchar(10) NOT NULL,
	"trip_type" "trip_type" DEFAULT 'leisure' NOT NULL,
	"language" varchar(20) DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lead_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" uuid,
	"service_type" "service_type" NOT NULL,
	"service_id" uuid,
	"ai_summary" text,
	"status" "lead_status" DEFAULT 'pending' NOT NULL,
	"client_ip" varchar(45),
	"client_user_agent" text,
	"detected_city" varchar(255),
	"detected_region" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organized_trip_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"language" "language" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"included_services" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organized_trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"departure_date" timestamp with time zone NOT NULL,
	"return_date" timestamp with time zone NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"available_seats" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "package_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_name" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"destination" varchar(100),
	"total_slots" integer NOT NULL,
	"booked_slots" integer DEFAULT 0 NOT NULL,
	"threshold_urgency" integer DEFAULT 3 NOT NULL,
	"is_sold_out" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_inventory_booked_slots_check" CHECK ("package_inventory"."booked_slots" <= "package_inventory"."total_slots")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(50) NOT NULL,
	"destination" varchar(100),
	"rule_type" "rule_type" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_phone" varchar(50) NOT NULL,
	"eco_credits" integer DEFAULT 0 NOT NULL,
	"membership_status" varchar(20) DEFAULT 'free' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_wallets_user_phone_unique" UNIQUE("user_phone")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"meta_fbp" varchar(255),
	"meta_fbc" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hotel_translations" ADD CONSTRAINT "hotel_translations_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inbound_trips" ADD CONSTRAINT "inbound_trips_client_trip_id_client_trips_id_fk" FOREIGN KEY ("client_trip_id") REFERENCES "public"."client_trips"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lead_requests" ADD CONSTRAINT "lead_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organized_trip_translations" ADD CONSTRAINT "organized_trip_translations_trip_id_organized_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."organized_trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_market_trends_session_idx" ON "ai_market_trends" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_market_trends_destination_idx" ON "ai_market_trends" USING btree ("detected_destination");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_market_trends_category_idx" ON "ai_market_trends" USING btree ("detected_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_market_trends_created_at_idx" ON "ai_market_trends" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_trips_session_idx" ON "client_trips" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_trips_destination_idx" ON "client_trips" USING btree ("destination");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_trips_status_idx" ON "client_trips" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_events_company_idx" ON "corporate_events" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_events_type_idx" ON "corporate_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "corporate_events_dates_idx" ON "corporate_events" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flights_departure_idx" ON "flights" USING btree ("departure_airport");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flights_arrival_idx" ON "flights" USING btree ("arrival_airport");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hotel_translations_hotel_lang_unique_idx" ON "hotel_translations" USING btree ("hotel_id","language");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotels_destination_idx" ON "hotels" USING btree ("destination");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotels_active_idx" ON "hotels" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_trips_client_trip_idx" ON "inbound_trips" USING btree ("client_trip_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_trips_type_idx" ON "inbound_trips" USING btree ("trip_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbound_trips_arrival_idx" ON "inbound_trips" USING btree ("arrival_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_requests_session_idx" ON "lead_requests" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_requests_user_idx" ON "lead_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_requests_status_idx" ON "lead_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_requests_ip_idx" ON "lead_requests" USING btree ("client_ip");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_requests_geo_idx" ON "lead_requests" USING btree ("detected_city","detected_region");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organized_trip_translations_trip_lang_unique_idx" ON "organized_trip_translations" USING btree ("trip_id","language");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "package_inventory_category_idx" ON "package_inventory" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "package_inventory_destination_idx" ON "package_inventory" USING btree ("destination");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "package_inventory_sold_out_idx" ON "package_inventory" USING btree ("is_sold_out");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_category_idx" ON "pricing_rules" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_destination_idx" ON "pricing_rules" USING btree ("destination");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_rule_type_idx" ON "pricing_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_active_idx" ON "pricing_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_wallets_phone_idx" ON "user_wallets" USING btree ("user_phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_wallets_status_idx" ON "user_wallets" USING btree ("membership_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users" USING btree ("phone");