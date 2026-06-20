CREATE TABLE IF NOT EXISTS "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_type" "service_type" NOT NULL,
	"destination" varchar(255),
	"markup_percent" numeric(5, 2) DEFAULT '1.10' NOT NULL,
	"fixed_discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"override_price" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_service_type_idx" ON "pricing_rules" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_destination_idx" ON "pricing_rules" USING btree ("destination");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_rules_active_idx" ON "pricing_rules" USING btree ("is_active");