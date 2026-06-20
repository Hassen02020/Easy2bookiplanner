CREATE TYPE "public"."language" AS ENUM('fr', 'ar', 'en');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('pending', 'converted_lead', 'redirected_whatsapp');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('markup_percentage', 'discount_fixed', 'override');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('hotel', 'flight', 'trip');--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "flights_departure_idx" ON "flights" USING btree ("departure_airport");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flights_arrival_idx" ON "flights" USING btree ("arrival_airport");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hotel_translations_hotel_lang_unique_idx" ON "hotel_translations" USING btree ("hotel_id","language");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotels_destination_idx" ON "hotels" USING btree ("destination");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotels_active_idx" ON "hotels" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_requests_session_idx" ON "lead_requests" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_requests_user_idx" ON "lead_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_requests_status_idx" ON "lead_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_requests_ip_idx" ON "lead_requests" USING btree ("client_ip");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lead_requests_geo_idx" ON "lead_requests" USING btree ("detected_city","detected_region");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "organized_trip_translations_trip_lang_unique_idx" ON "organized_trip_translations" USING btree ("trip_id","language");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_category_idx" ON "pricing_rules" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_destination_idx" ON "pricing_rules" USING btree ("destination");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_rule_type_idx" ON "pricing_rules" USING btree ("rule_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_active_idx" ON "pricing_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "users" USING btree ("phone");