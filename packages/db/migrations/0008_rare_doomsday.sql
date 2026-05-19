ALTER TABLE "campaign_recipients" DROP CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "campaign_recipients" ALTER COLUMN "contact_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;