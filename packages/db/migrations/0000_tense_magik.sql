CREATE TABLE "contact_import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"contact_import_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"status" text NOT NULL,
	"contact_id" uuid,
	"raw_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"file_key" text NOT NULL,
	"filename" text NOT NULL,
	"file_size" integer NOT NULL,
	"content_type" text NOT NULL,
	"checksum" text,
	"source" text,
	"phone_country_code" text DEFAULT 'SE' NOT NULL,
	"mapping" jsonb,
	"preview" jsonb,
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
	"last_service" text,
	"consent_status" text DEFAULT 'unknown' NOT NULL,
	"source" text,
	"created_from_import_id" uuid,
	"last_import_id" uuid,
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_import_rows" ADD CONSTRAINT "contact_import_rows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_import_rows" ADD CONSTRAINT "contact_import_rows_contact_import_id_contact_imports_id_fk" FOREIGN KEY ("contact_import_id") REFERENCES "public"."contact_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_import_rows" ADD CONSTRAINT "contact_import_rows_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_permission_attested_by_user_id_users_id_fk" FOREIGN KEY ("permission_attested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_legal_document_id_legal_documents_id_fk" FOREIGN KEY ("legal_document_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_legal_acceptances" ADD CONSTRAINT "organization_legal_acceptances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_legal_acceptances" ADD CONSTRAINT "organization_legal_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_import_rows_import_row_idx" ON "contact_import_rows" USING btree ("organization_id","contact_import_id","row_number");--> statement-breakpoint
CREATE INDEX "contact_import_rows_import_status_idx" ON "contact_import_rows" USING btree ("organization_id","contact_import_id","status");--> statement-breakpoint
CREATE INDEX "contact_imports_organization_created_idx" ON "contact_imports" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_imports_organization_status_idx" ON "contact_imports" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "contacts_organization_id_idx" ON "contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contacts_organization_last_import_idx" ON "contacts" USING btree ("organization_id","last_import_id");--> statement-breakpoint
CREATE INDEX "contacts_organization_last_contacted_idx" ON "contacts" USING btree ("organization_id","last_contacted_at");--> statement-breakpoint
CREATE INDEX "contacts_organization_last_booking_idx" ON "contacts" USING btree ("organization_id","last_booking_at");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_organization_phone_hash_idx" ON "contacts" USING btree ("organization_id","phone_hash") WHERE phone_hash is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_organization_email_hash_idx" ON "contacts" USING btree ("organization_id","email_hash") WHERE email_hash is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "suppressions_organization_type_hash_idx" ON "suppressions" USING btree ("organization_id","type","value_hash");--> statement-breakpoint
CREATE INDEX "suppressions_organization_created_idx" ON "suppressions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_document_type_idx" ON "legal_documents" USING btree ("document_type");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_slug_idx" ON "legal_documents" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_document_id_version_idx" ON "legal_document_versions" USING btree ("legal_document_id","document_version");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_type_version_idx" ON "legal_document_versions" USING btree ("document_type","document_version");--> statement-breakpoint
CREATE INDEX "legal_document_versions_type_status_idx" ON "legal_document_versions" USING btree ("document_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_legal_acceptances_org_bundle_version_idx" ON "organization_legal_acceptances" USING btree ("organization_id","bundle_version");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_profiles_organization_id_idx" ON "organization_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_clerk_organization_id_idx" ON "organizations" USING btree ("clerk_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");