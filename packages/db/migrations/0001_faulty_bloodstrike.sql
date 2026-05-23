CREATE TABLE "booking_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"checked_through_date" date,
	"note" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reported_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"booking_report_id" uuid NOT NULL,
	"booking_date" date NOT NULL,
	"customer_name" text,
	"phone" text,
	"email" text,
	"normalized_phone" text,
	"normalized_email" text,
	"phone_hash" text,
	"email_hash" text,
	"revenue_amount_minor" bigint,
	"currency" text NOT NULL,
	"service" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD COLUMN "reporting_currency" text DEFAULT 'SEK' NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_reports" ADD CONSTRAINT "booking_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_reports" ADD CONSTRAINT "booking_reports_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_reports" ADD CONSTRAINT "booking_reports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reported_bookings" ADD CONSTRAINT "reported_bookings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reported_bookings" ADD CONSTRAINT "reported_bookings_booking_report_id_booking_reports_id_fk" FOREIGN KEY ("booking_report_id") REFERENCES "public"."booking_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_reports_organization_campaign_created_idx" ON "booking_reports" USING btree ("organization_id","campaign_id","created_at");--> statement-breakpoint
CREATE INDEX "reported_bookings_organization_report_date_idx" ON "reported_bookings" USING btree ("organization_id","booking_report_id","booking_date");--> statement-breakpoint
CREATE INDEX "reported_bookings_organization_phone_idx" ON "reported_bookings" USING btree ("organization_id","phone_hash");--> statement-breakpoint
CREATE INDEX "reported_bookings_organization_email_idx" ON "reported_bookings" USING btree ("organization_id","email_hash");