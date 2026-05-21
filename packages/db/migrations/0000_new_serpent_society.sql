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
	"credit_bucket" text DEFAULT 'purchased' NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"metadata" jsonb NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid,
	"status" text DEFAULT 'selected' NOT NULL,
	"exclusion_reason" text,
	"name" text,
	"phone" text,
	"email" text,
	"normalized_phone" text,
	"normalized_email" text,
	"phone_hash" text,
	"email_hash" text,
	"last_booking_at" timestamp with time zone,
	"last_contacted_at" timestamp with time zone,
	"selected_at" timestamp with time zone,
	"queued_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"audience_rule" jsonb NOT NULL,
	"sms_body" text,
	"booking_url" text,
	"campaign_code" text,
	"attribution_window_days" integer DEFAULT 7 NOT NULL,
	"ready_to_send_at" timestamp with time zone,
	"ready_to_send_by_user_id" uuid,
	"send_started_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"reserved_credit_count" integer,
	"actual_credit_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"file_key" text,
	"phone_country_code" text DEFAULT 'SE' NOT NULL,
	"mapping" jsonb,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"processed_rows" integer DEFAULT 0 NOT NULL,
	"created_count" integer DEFAULT 0 NOT NULL,
	"updated_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"invalid_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"suppressed_count" integer DEFAULT 0 NOT NULL,
	"error_summary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"permission_attested_at" timestamp with time zone,
	"permission_attested_by_user_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"normalized_phone" text,
	"normalized_email" text,
	"phone_hash" text,
	"email_hash" text,
	"last_booking_at" timestamp with time zone,
	"last_contacted_at" timestamp with time zone,
	"consent_status" text DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"normalized_value" text NOT NULL,
	"value_hash" text NOT NULL,
	"reason" text NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "click_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"tracking_link_id" uuid NOT NULL,
	"user_agent" text,
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
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_type" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"public_visible" boolean DEFAULT true NOT NULL,
	"acceptance_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_document_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"document_version" text NOT NULL,
	"title" text NOT NULL,
	"body_mdx" text NOT NULL,
	"content_hash" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"effective_date" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_legal_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"bundle_version" text NOT NULL,
	"bundle_hash" text NOT NULL,
	"documents_snapshot" jsonb NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"registration_number" text NOT NULL,
	"billing_email" text NOT NULL,
	"responsible_name" text NOT NULL,
	"responsible_email" text NOT NULL,
	"responsible_phone" text,
	"country_code" text DEFAULT 'SE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"onboarding_status" text DEFAULT 'profile_required' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"received_at" timestamp with time zone,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_billing_profiles" ADD CONSTRAINT "organization_billing_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_credit_transactions" ADD CONSTRAINT "sms_credit_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_ready_to_send_by_user_id_users_id_fk" FOREIGN KEY ("ready_to_send_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_permission_attested_by_user_id_users_id_fk" FOREIGN KEY ("permission_attested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_tracking_link_id_tracking_links_id_fk" FOREIGN KEY ("tracking_link_id") REFERENCES "public"."tracking_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_message_events" ADD CONSTRAINT "campaign_message_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_message_events" ADD CONSTRAINT "campaign_message_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_message_events" ADD CONSTRAINT "campaign_message_events_message_id_sms_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."sms_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_message_events" ADD CONSTRAINT "campaign_message_events_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_legal_document_id_legal_documents_id_fk" FOREIGN KEY ("legal_document_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_legal_acceptances" ADD CONSTRAINT "organization_legal_acceptances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_legal_acceptances" ADD CONSTRAINT "organization_legal_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_sms_senders" ADD CONSTRAINT "organization_sms_senders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_recipient_id_campaign_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."campaign_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_webhook_events_stripe_event_id_idx" ON "billing_webhook_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_organization_id_idx" ON "billing_webhook_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_event_type_idx" ON "billing_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "billing_webhook_events_status_idx" ON "billing_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_billing_profiles_organization_id_idx" ON "organization_billing_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_billing_profiles_stripe_customer_id_idx" ON "organization_billing_profiles" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "organization_billing_profiles_subscription_status_idx" ON "organization_billing_profiles" USING btree ("subscription_status");--> statement-breakpoint
CREATE INDEX "sms_credit_transactions_organization_created_idx" ON "sms_credit_transactions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_credit_transactions_source_idx" ON "sms_credit_transactions" USING btree ("source","source_id","credit_bucket");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_created_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "campaign_recipients_organization_campaign_idx" ON "campaign_recipients" USING btree ("organization_id","campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_recipients_organization_status_idx" ON "campaign_recipients" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "campaign_recipients_organization_phone_sent_idx" ON "campaign_recipients" USING btree ("organization_id","phone_hash","sent_at");--> statement-breakpoint
CREATE INDEX "campaigns_organization_created_idx" ON "campaigns" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "campaigns_organization_status_idx" ON "campaigns" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "contact_imports_organization_created_idx" ON "contact_imports" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_imports_organization_status_idx" ON "contact_imports" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "contacts_organization_id_idx" ON "contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contacts_organization_last_contacted_idx" ON "contacts" USING btree ("organization_id","last_contacted_at");--> statement-breakpoint
CREATE INDEX "contacts_organization_last_booking_idx" ON "contacts" USING btree ("organization_id","last_booking_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_organization_phone_hash_idx" ON "contacts" USING btree ("organization_id","phone_hash") WHERE phone_hash is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_organization_email_hash_idx" ON "contacts" USING btree ("organization_id","email_hash") WHERE email_hash is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "suppressions_organization_type_hash_idx" ON "suppressions" USING btree ("organization_id","type","value_hash");--> statement-breakpoint
CREATE INDEX "suppressions_organization_created_idx" ON "suppressions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "click_events_organization_campaign_idx" ON "click_events" USING btree ("organization_id","campaign_id");--> statement-breakpoint
CREATE INDEX "click_events_tracking_link_idx" ON "click_events" USING btree ("tracking_link_id");--> statement-breakpoint
CREATE INDEX "campaign_message_events_provider_message_idx" ON "campaign_message_events" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE INDEX "campaign_message_events_organization_campaign_idx" ON "campaign_message_events" USING btree ("organization_id","campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_message_events_provider_message_event_idx" ON "campaign_message_events" USING btree ("provider","provider_message_id","event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_document_type_idx" ON "legal_documents" USING btree ("document_type");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_slug_idx" ON "legal_documents" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_document_id_version_idx" ON "legal_document_versions" USING btree ("legal_document_id","document_version");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_type_version_idx" ON "legal_document_versions" USING btree ("document_type","document_version");--> statement-breakpoint
CREATE INDEX "legal_document_versions_type_status_idx" ON "legal_document_versions" USING btree ("document_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_legal_acceptances_org_bundle_version_idx" ON "organization_legal_acceptances" USING btree ("organization_id","bundle_version");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_profiles_organization_id_idx" ON "organization_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_clerk_organization_id_idx" ON "organizations" USING btree ("clerk_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_sms_senders_organization_provider_idx" ON "organization_sms_senders" USING btree ("organization_id","provider");--> statement-breakpoint
CREATE INDEX "organization_sms_senders_organization_status_idx" ON "organization_sms_senders" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "organization_sms_senders_provider_service_idx" ON "organization_sms_senders" USING btree ("provider","provider_messaging_service_id");--> statement-breakpoint
CREATE INDEX "organization_sms_senders_provider_phone_ref_idx" ON "organization_sms_senders" USING btree ("provider","provider_phone_number_id");--> statement-breakpoint
CREATE INDEX "organization_sms_senders_provider_phone_idx" ON "organization_sms_senders" USING btree ("provider","phone_number");--> statement-breakpoint
CREATE INDEX "sms_messages_organization_campaign_idx" ON "sms_messages" USING btree ("organization_id","campaign_id");--> statement-breakpoint
CREATE INDEX "sms_messages_organization_received_idx" ON "sms_messages" USING btree ("organization_id","received_at");--> statement-breakpoint
CREATE INDEX "sms_messages_organization_contact_idx" ON "sms_messages" USING btree ("organization_id","contact_id");--> statement-breakpoint
CREATE INDEX "sms_messages_organization_recipient_idx" ON "sms_messages" USING btree ("organization_id","recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_messages_provider_message_idx" ON "sms_messages" USING btree ("provider","provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sms_messages_campaign_recipient_direction_idx" ON "sms_messages" USING btree ("organization_id","campaign_id","recipient_id","direction");--> statement-breakpoint
CREATE UNIQUE INDEX "tracking_links_code_idx" ON "tracking_links" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "tracking_links_recipient_idx" ON "tracking_links" USING btree ("organization_id","recipient_id");--> statement-breakpoint
CREATE INDEX "tracking_links_organization_campaign_idx" ON "tracking_links" USING btree ("organization_id","campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");