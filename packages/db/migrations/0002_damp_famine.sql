CREATE TABLE "billing_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"organization_id" uuid,
	"status" text DEFAULT 'received' NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organization_billing_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"plan_key" text,
	"subscription_status" text DEFAULT 'none' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"transaction_type" text NOT NULL,
	"credits" integer NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_billing_profiles" ADD CONSTRAINT "organization_billing_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_credit_transactions" ADD CONSTRAINT "sms_credit_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_webhook_events_stripe_event_id_idx" ON "billing_webhook_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_organization_id_idx" ON "billing_webhook_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_event_type_idx" ON "billing_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_status_idx" ON "billing_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_billing_profiles_organization_id_idx" ON "organization_billing_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_billing_profiles_stripe_customer_id_idx" ON "organization_billing_profiles" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "organization_billing_profiles_subscription_status_idx" ON "organization_billing_profiles" USING btree ("subscription_status");--> statement-breakpoint
CREATE INDEX "sms_credit_transactions_organization_created_idx" ON "sms_credit_transactions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_credit_transactions_source_idx" ON "sms_credit_transactions" USING btree ("source","source_id");