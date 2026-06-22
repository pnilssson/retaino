ALTER TABLE "sms_conversations" ADD COLUMN "unread_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sms_conversations" DROP COLUMN "last_read_at";