CREATE TABLE "legal_document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"document_type" text NOT NULL,
	"document_version" text NOT NULL,
	"effective_date" text NOT NULL,
	"markdown_path" text NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_type_version_idx" ON "legal_document_versions" USING btree ("document_type","document_version");
--> statement-breakpoint
INSERT INTO "legal_document_versions" (
	"title",
	"document_type",
	"document_version",
	"effective_date",
	"markdown_path",
	"content_hash"
) VALUES
	('Retaino Terms', 'terms', '2026-05-05', '2026-05-05', 'docs/legal/terms-2026-05-05.md', 'da3da4172ddb072b1b624a12b28b97cdc1331b02b362e24ec7a166b08bba6620'),
	('Retaino Data Processing Agreement', 'dpa', '2026-05-05', '2026-05-05', 'docs/legal/dpa-2026-05-05.md', 'e1238c811d3a43a0ff0dce2b00195edc448a7ec73601ea54e7259bf5a68d6be5'),
	('Retaino Subprocessor Notice', 'subprocessors', '2026-05-05', '2026-05-05', 'docs/legal/subprocessors-2026-05-05.md', '6b3b2a7282b0515537be981b80fc9db1fb7c3174d1495a6394719873cc49aca8'),
	('Retaino Transfer Terms', 'transfer_terms', '2026-05-05', '2026-05-05', 'docs/legal/transfer-terms-2026-05-05.md', 'e0775d4894718dac19e8390a502e2e6b7f89ded9f7fa2bcb7e3219515f1b9829'),
	('Retaino Sending Policy', 'sending_policy', '2026-05-05', '2026-05-05', 'docs/legal/sending-policy-2026-05-05.md', '614e69fc9d498d5a796d8c3d4020d1681d03c03a2e74cd53516ac687bc5db07d'),
	('Retaino SMS Marketing Attestation', 'campaign_attestation', '2026-05-05', '2026-05-05', 'docs/legal/campaign-attestation-2026-05-05.md', 'e5c54c25679868aae3e9be4d223722f7c8f84f25292659c03403771967a02513');
