CREATE TABLE "sms_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"campaign_id" uuid,
	"recipient_id" uuid,
	"contact_id" uuid,
	"provider" text NOT NULL,
	"provider_message_id" text,
	"provider_messaging_service_id" text,
	"provider_phone_number_id" text,
	"from_phone" text,
	"to_phone" text NOT NULL,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"estimated_segment_count" integer NOT NULL,
	"actual_segment_count" integer,
	"estimated_cost_minor" integer,
	"actual_cost_minor" integer,
	"currency" text,
	"queued_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"code" text NOT NULL,
	"target_url" text NOT NULL,
	"phone_hash" text,
	"email_hash" text,
	"first_clicked_at" timestamp with time zone,
	"last_clicked_at" timestamp with time zone,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "send_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "reserved_credit_count" integer;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "actual_credit_count" integer;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sms_messages_organization_campaign_idx" ON "sms_messages" USING btree ("organization_id","campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_messages_provider_message_idx" ON "sms_messages" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_messages_campaign_recipient_direction_idx" ON "sms_messages" USING btree ("organization_id","campaign_id","recipient_id","direction");--> statement-breakpoint
CREATE UNIQUE INDEX "tracking_links_code_idx" ON "tracking_links" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "tracking_links_recipient_idx" ON "tracking_links" USING btree ("organization_id","recipient_id");--> statement-breakpoint
CREATE INDEX "tracking_links_organization_campaign_idx" ON "tracking_links" USING btree ("organization_id","campaign_id");