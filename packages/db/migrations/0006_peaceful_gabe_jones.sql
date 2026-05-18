CREATE TABLE "organization_sms_senders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"phone_number" text,
	"country_code" text,
	"number_type" text,
	"provider_messaging_service_id" text,
	"provider_phone_number_id" text,
	"regulatory_status" text,
	"failure_reason" text,
	"provisioned_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_sms_senders" ADD CONSTRAINT "organization_sms_senders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_sms_senders_organization_provider_idx" ON "organization_sms_senders" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "organization_sms_senders_organization_status_idx" ON "organization_sms_senders" USING btree ("organization_id","status");