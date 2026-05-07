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
CREATE TABLE "organization_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"legal_document_version_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"document_version" text NOT NULL,
	"content_hash" text NOT NULL,
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
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_legal_document_id_legal_documents_id_fk" FOREIGN KEY ("legal_document_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_acceptances" ADD CONSTRAINT "organization_acceptances_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_acceptances" ADD CONSTRAINT "organization_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_acceptances" ADD CONSTRAINT "organization_acceptances_legal_document_version_id_legal_document_versions_id_fk" FOREIGN KEY ("legal_document_version_id") REFERENCES "public"."legal_document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_document_type_idx" ON "legal_documents" USING btree ("document_type");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_slug_idx" ON "legal_documents" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_document_id_version_idx" ON "legal_document_versions" USING btree ("legal_document_id","document_version");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_type_version_idx" ON "legal_document_versions" USING btree ("document_type","document_version");--> statement-breakpoint
CREATE INDEX "legal_document_versions_type_status_idx" ON "legal_document_versions" USING btree ("document_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_acceptances_org_document_version_idx" ON "organization_acceptances" USING btree ("organization_id","legal_document_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_profiles_organization_id_idx" ON "organization_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_clerk_organization_id_idx" ON "organizations" USING btree ("clerk_organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_user_id_idx" ON "users" USING btree ("clerk_user_id");