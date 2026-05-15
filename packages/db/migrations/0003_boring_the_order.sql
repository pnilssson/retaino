DROP INDEX "sms_credit_transactions_source_idx";--> statement-breakpoint
ALTER TABLE "sms_credit_transactions" ADD COLUMN "credit_bucket" text DEFAULT 'purchased' NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_credit_transactions" ADD COLUMN "period_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sms_credit_transactions" ADD COLUMN "period_end" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "sms_credit_transactions_source_idx" ON "sms_credit_transactions" USING btree ("source","source_id","credit_bucket");