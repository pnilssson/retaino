CREATE TABLE "sms_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"phone_hash" text NOT NULL,
	"normalized_phone" text NOT NULL,
	"last_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "sms_messages_campaign_recipient_direction_idx";--> statement-breakpoint
ALTER TABLE "sms_messages" ADD COLUMN "normalized_phone" text;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD COLUMN "phone_hash" text;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "sms_conversations" ADD CONSTRAINT "sms_conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sms_conversations_organization_phone_hash_idx" ON "sms_conversations" USING btree ("organization_id","phone_hash");--> statement-breakpoint
CREATE INDEX "sms_messages_organization_phone_created_idx" ON "sms_messages" USING btree ("organization_id","phone_hash","created_at");--> statement-breakpoint
CREATE INDEX "sms_messages_organization_contact_created_idx" ON "sms_messages" USING btree ("organization_id","contact_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_messages_organization_idempotency_idx" ON "sms_messages" USING btree ("organization_id","idempotency_key");