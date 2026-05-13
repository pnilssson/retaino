ALTER TABLE "contact_import_rows" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "contact_import_rows" CASCADE;--> statement-breakpoint
DROP INDEX "contacts_organization_last_import_idx";--> statement-breakpoint
ALTER TABLE "contact_imports" ALTER COLUMN "status" SET DEFAULT 'processing';--> statement-breakpoint
ALTER TABLE "contact_imports" ALTER COLUMN "file_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_imports" DROP COLUMN "filename";--> statement-breakpoint
ALTER TABLE "contact_imports" DROP COLUMN "file_size";--> statement-breakpoint
ALTER TABLE "contact_imports" DROP COLUMN "content_type";--> statement-breakpoint
ALTER TABLE "contact_imports" DROP COLUMN "checksum";--> statement-breakpoint
ALTER TABLE "contact_imports" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "contact_imports" DROP COLUMN "preview";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN "last_service";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN "created_from_import_id";--> statement-breakpoint
ALTER TABLE "contacts" DROP COLUMN "last_import_id";