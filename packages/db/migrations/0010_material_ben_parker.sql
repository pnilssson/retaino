CREATE TABLE "click_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"tracking_link_id" uuid NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_message_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid,
	"message_id" uuid,
	"recipient_id" uuid,
	"provider" text NOT NULL,
	"provider_message_id" text NOT NULL,
	"event_type" text NOT NULL,
	"raw_status" text,
	"raw_payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sms_messages" ADD COLUMN "received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_tracking_link_id_tracking_links_id_fk" FOREIGN KEY ("tracking_link_id") REFERENCES "public"."tracking_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_message_events" ADD CONSTRAINT "campaign_message_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_message_events" ADD CONSTRAINT "campaign_message_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_message_events" ADD CONSTRAINT "campaign_message_events_message_id_sms_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."sms_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_message_events" ADD CONSTRAINT "campaign_message_events_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "click_events_organization_campaign_idx" ON "click_events" USING btree ("organization_id","campaign_id");--> statement-breakpoint
CREATE INDEX "click_events_tracking_link_idx" ON "click_events" USING btree ("tracking_link_id");--> statement-breakpoint
CREATE INDEX "campaign_message_events_provider_message_idx" ON "campaign_message_events" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE INDEX "campaign_message_events_organization_campaign_idx" ON "campaign_message_events" USING btree ("organization_id","campaign_id");--> statement-breakpoint
CREATE INDEX "sms_messages_organization_received_idx" ON "sms_messages" USING btree ("organization_id","received_at");--> statement-breakpoint
CREATE INDEX "sms_messages_organization_contact_idx" ON "sms_messages" USING btree ("organization_id","contact_id");--> statement-breakpoint
CREATE INDEX "sms_messages_organization_recipient_idx" ON "sms_messages" USING btree ("organization_id","recipient_id");