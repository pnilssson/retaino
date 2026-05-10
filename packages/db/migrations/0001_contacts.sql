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
ALTER TABLE "organization_profiles" ADD COLUMN "country_code" text DEFAULT 'SE' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_import_rows" ADD CONSTRAINT "contact_import_rows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_import_rows" ADD CONSTRAINT "contact_import_rows_contact_import_id_contact_imports_id_fk" FOREIGN KEY ("contact_import_id") REFERENCES "public"."contact_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_import_rows" ADD CONSTRAINT "contact_import_rows_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX "suppressions_organization_created_idx" ON "suppressions" USING btree ("organization_id","created_at");