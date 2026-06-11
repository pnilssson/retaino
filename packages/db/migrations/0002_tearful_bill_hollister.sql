DROP INDEX "legal_documents_document_type_idx";--> statement-breakpoint
DROP INDEX "legal_documents_slug_idx";--> statement-breakpoint
DROP INDEX "legal_document_versions_type_version_idx";--> statement-breakpoint
DROP INDEX "legal_document_versions_type_status_idx";--> statement-breakpoint
ALTER TABLE "legal_documents" ADD COLUMN "locale" text DEFAULT 'sv' NOT NULL;--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD COLUMN "locale" text DEFAULT 'sv' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_legal_acceptances" ADD COLUMN "locale" text DEFAULT 'sv' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_document_type_locale_idx" ON "legal_documents" USING btree ("document_type","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_slug_locale_idx" ON "legal_documents" USING btree ("slug","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_type_locale_version_idx" ON "legal_document_versions" USING btree ("document_type","locale","document_version");--> statement-breakpoint
CREATE INDEX "legal_document_versions_type_locale_status_idx" ON "legal_document_versions" USING btree ("document_type","locale","status");