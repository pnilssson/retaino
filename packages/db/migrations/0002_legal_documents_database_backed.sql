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
CREATE UNIQUE INDEX "legal_documents_document_type_idx" ON "legal_documents" USING btree ("document_type");
--> statement-breakpoint
CREATE UNIQUE INDEX "legal_documents_slug_idx" ON "legal_documents" USING btree ("slug");
--> statement-breakpoint
INSERT INTO "legal_documents" (
  "document_type",
  "slug",
  "title",
  "public_visible",
  "acceptance_required",
  "sort_order"
) VALUES
  ('terms', 'terms', 'Retaino Terms', true, true, 10),
  ('privacy', 'privacy', 'Retaino Privacy Policy', true, false, 20),
  ('cookies', 'cookies', 'Retaino Cookie Policy', true, false, 30),
  ('dpa', 'dpa', 'Retaino Data Processing Agreement', true, true, 40),
  ('subprocessors', 'subprocessors', 'Retaino Subprocessor Notice', true, true, 50),
  ('transfer_terms', 'transfer_terms', 'Retaino Transfer Terms', true, true, 60),
  ('sending_policy', 'sending_policy', 'Retaino Sending Policy', true, true, 70),
  ('campaign_attestation', 'campaign_attestation', 'Retaino SMS Marketing Attestation', true, true, 80)
ON CONFLICT ("document_type") DO UPDATE SET
  "slug" = excluded."slug",
  "title" = excluded."title",
  "public_visible" = excluded."public_visible",
  "acceptance_required" = excluded."acceptance_required",
  "sort_order" = excluded."sort_order",
  "updated_at" = now();
--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD COLUMN "legal_document_id" uuid;
--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD COLUMN "body_mdx" text;
--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD COLUMN "status" text DEFAULT 'draft';
--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD COLUMN "published_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
INSERT INTO "legal_document_versions" (
  "legal_document_id",
  "document_type",
  "document_version",
  "title",
  "markdown_path",
  "body_mdx",
  "content_hash",
  "status",
  "effective_date",
  "published_at"
) VALUES
  ((SELECT "id" FROM "legal_documents" WHERE "document_type" = 'terms'), 'terms', '2026-05-05', 'Retaino Terms', 'docs/legal/terms-2026-05-05.md', $mdx$# Retaino Terms

Version: 2026-05-05
Effective date: 2026-05-05

These terms govern the customer's use of Retaino. The customer may use Retaino
only for lawful customer reactivation, campaign preparation, reporting, and
related account administration.

## Customer responsibilities

The customer is responsible for the accuracy of account information, user access,
imported contact data, campaign content, and lawful use of Retaino. The customer
must keep credentials secure and must remove users who should no longer have
access.

## Retaino responsibilities

Retaino will provide the hosted service with reasonable administrative,
technical, and organizational safeguards. Retaino may update the service to
improve reliability, security, compliance, or product quality.

## Data use

Retaino may process customer data only to provide, secure, support, and improve
the service, or as otherwise instructed by the customer.

## Suspension

Retaino may suspend access when use creates a security risk, violates the sending
policy, infringes third-party rights, or may expose Retaino or others to legal or
operational harm.

## Changes

Material changes to these terms require acceptance of the new version before the
customer can continue gated product workflows.
$mdx$, 'da3da4172ddb072b1b624a12b28b97cdc1331b02b362e24ec7a166b08bba6620', 'published', '2026-05-05', '2026-05-05T00:00:00Z'),
  ((SELECT "id" FROM "legal_documents" WHERE "document_type" = 'privacy'), 'privacy', '2026-05-07', 'Retaino Privacy Policy', 'docs/legal/privacy-2026-05-07.md', $mdx$# Retaino Privacy Policy

Last updated: 2026-05-07

This policy explains how Retaino handles personal data when you visit the website, sign in, manage organizations, import customer data, prepare campaigns, and measure recovered bookings.

## Controller and contact

Retaino is the controller for account, website, billing, and product operations data described in this policy. When a customer imports contact, campaign, or booking data, the customer is the controller and Retaino acts as processor under the Data Processing Agreement.

Contact us at hello@retaino.com for privacy requests or questions.

## Data we collect

### Account and authentication data

We process email addresses, names, organization membership, roles, and authentication identifiers needed to create and protect accounts through Clerk.

### Customer and campaign data

We process imported customer records, phone numbers, email addresses, booking metadata, campaign content, consent evidence, opt-out status, and campaign readiness information provided by the customer.

### Booking and reporting data

We process booking imports, attribution signals, campaign events, recovered booking counts, revenue summaries, and related reporting data.

### Payment data

Polar processes checkout and payment records. Retaino receives the payment status and plan information needed to provide access and account administration.

### Technical data

We process request metadata, device and browser information, security logs, error details, and cookie consent records needed to operate and protect the service.

## Why we use the data

| Purpose | Legal basis |
| --- | --- |
| Create and secure accounts and organizations. | Contract and legitimate interests in account security. |
| Provide customer reactivation, campaigns, and reporting. | Contract or documented customer instructions. |
| Confirm payments and manage plan access. | Contract and legal obligations for payment records. |
| Maintain reliability, investigate errors, and prevent abuse. | Legitimate interests in operating a secure service. |
| Remember cookie choices and optional preferences. | Legal obligation and consent where required. |

## Processors

We use service providers for authentication, database hosting, frontend hosting, API hosting, payments, and background job orchestration.

## Your rights

Depending on where you live, you may have the right to access, correct, delete, restrict, export, or object to the processing of your personal data. You may also withdraw consent where processing depends on consent.
$mdx$, '3d9e3602f2ee584456dbf3beb70911a16aca1ef68bcdca09cb59478d29f001e9', 'published', '2026-05-07', '2026-05-07T00:00:00Z'),
  ((SELECT "id" FROM "legal_documents" WHERE "document_type" = 'cookies'), 'cookies', '2026-05-07', 'Retaino Cookie Policy', 'docs/legal/cookies-2026-05-07.md', $mdx$# Retaino Cookie Policy

Last updated: 2026-05-07

This policy explains how Retaino uses cookies and browser storage. It should be read with the Privacy Policy.

## What cookies are

Cookies are small files stored by your browser. Browser storage such as localStorage serves a similar purpose by keeping a value in your browser for later visits.

## Essential cookies and storage

Retaino uses essential cookies and browser storage to keep sign-in, security, organization access, preferences, and cookie choices working. These are needed for the site and app to function.

| Name | Purpose | Duration |
| --- | --- | --- |
| `__clerk_*` and `__session` | Used by Clerk to sign you in and protect your session. | Set by Clerk based on the session and security state. |
| `sidebar_state` | Remembers whether your app navigation is expanded. | 7 days. |
| `retaino-cookie-consent` | Stores your cookie preference in localStorage. | Until cleared from your browser or the consent version changes. |

## Optional analytics

Retaino does not set optional analytics cookies right now. The cookie preferences panel still records whether you allow analytics, so optional measurement remains off unless you choose to allow it.

| Name | Purpose | Duration |
| --- | --- | --- |
| None currently set by Retaino. | No optional analytics cookies are active. | Not applicable. |

## Managing your choice

You can accept optional analytics, keep essential cookies only, or open preferences from the cookie banner. You can also clear cookies and site data in your browser settings.

## Contact

For questions about cookies, contact hello@retaino.com.
$mdx$, '3d77b9263ff0ea8a70246442dfeaabd9dcf0deb48dcc9138b35cf43acc14580b', 'published', '2026-05-07', '2026-05-07T00:00:00Z'),
  ((SELECT "id" FROM "legal_documents" WHERE "document_type" = 'dpa'), 'dpa', '2026-05-05', 'Retaino Data Processing Agreement', 'docs/legal/dpa-2026-05-05.md', $mdx$# Retaino Data Processing Agreement

Version: 2026-05-05
Effective date: 2026-05-05

This Data Processing Agreement applies when Retaino processes personal data for
the customer as processor. The customer is the controller for imported contacts,
campaign data, booking references, and related account data.

## Processing instructions

Retaino processes personal data only on documented customer instructions,
including instructions expressed through product configuration and use.

## Processing scope

The subject matter is customer reactivation and related reporting. The duration
is the customer's subscription period plus retention needed for deletion,
security, legal, or audit purposes. Categories may include customer names, phone
numbers, email addresses, booking metadata, campaign status, consent evidence,
and opt-out records.

## Security

Retaino will maintain appropriate technical and organizational measures designed
to protect personal data against unauthorized access, loss, alteration, and
disclosure.

## Assistance

Retaino will provide reasonable assistance for data subject requests, security
incidents, data protection impact assessments, and regulator requests where the
customer cannot reasonably handle them without Retaino.

## Deletion and return

Upon termination, Retaino will delete or return personal data according to the
service settings and legal retention requirements.

## Audits

Retaino will make information reasonably necessary to demonstrate compliance
available to the customer and will support audits through documentation,
security summaries, and commercially reasonable cooperation.
$mdx$, 'e1238c811d3a43a0ff0dce2b00195edc448a7ec73601ea54e7259bf5a68d6be5', 'published', '2026-05-05', '2026-05-05T00:00:00Z'),
  ((SELECT "id" FROM "legal_documents" WHERE "document_type" = 'subprocessors'), 'subprocessors', '2026-05-05', 'Retaino Subprocessor Notice', 'docs/legal/subprocessors-2026-05-05.md', $mdx$# Retaino Subprocessor Notice

Version: 2026-05-05
Effective date: 2026-05-05

The customer authorizes Retaino to use subprocessors needed to provide, secure,
host, support, and monitor the service.

## General authorization

Retaino may appoint subprocessors if they are bound by written obligations that
protect customer personal data to a standard materially consistent with the Data
Processing Agreement.

## Notice of changes

Retaino will provide notice of material subprocessor changes through the product,
email, or a published legal page. The customer may object on reasonable data
protection grounds before the change takes effect.

## Current subprocessors

- Neon, database hosting and storage.
- Vercel, web application hosting.
- Cloudflare, API hosting, traffic routing, and security.
- Clerk, authentication and organization management.
- Polar, payment processing.
- Inngest, background job orchestration.

## Objections

If the customer objects to a new subprocessor and Retaino cannot reasonably
resolve the objection, either party may terminate the affected service.
$mdx$, '6b3b2a7282b0515537be981b80fc9db1fb7c3174d1495a6394719873cc49aca8', 'published', '2026-05-05', '2026-05-05T00:00:00Z'),
  ((SELECT "id" FROM "legal_documents" WHERE "document_type" = 'transfer_terms'), 'transfer_terms', '2026-05-05', 'Retaino Transfer Terms', 'docs/legal/transfer-terms-2026-05-05.md', $mdx$# Retaino Transfer Terms

Version: 2026-05-05
Effective date: 2026-05-05

These terms apply when a Retaino vendor or subprocessor processes personal data
outside the European Union or European Economic Area.

## Transfer mechanism

Retaino will use an appropriate transfer mechanism, such as the European
Commission Standard Contractual Clauses, an adequacy decision, or another lawful
mechanism available under applicable data protection law.

## Transfer assessment

Retaino will assess transfer risks that are relevant to the service, the data
categories, the destination, and the safeguards available from the vendor.

## Supplementary safeguards

Retaino will use reasonable supplementary safeguards where appropriate, including
access controls, encryption in transit, vendor due diligence, contractual limits,
and incident response obligations.

## Customer cooperation

The customer must provide accurate information about its intended processing and
must not import data that Retaino has prohibited or cannot lawfully process under
the agreed safeguards.
$mdx$, 'e0775d4894718dac19e8390a502e2e6b7f89ded9f7fa2bcb7e3219515f1b9829', 'published', '2026-05-05', '2026-05-05T00:00:00Z'),
  ((SELECT "id" FROM "legal_documents" WHERE "document_type" = 'sending_policy'), 'sending_policy', '2026-05-05', 'Retaino Sending Policy', 'docs/legal/sending-policy-2026-05-05.md', $mdx$# Retaino Sending Policy

Version: 2026-05-05
Effective date: 2026-05-05

This policy governs SMS marketing and related campaign activity in Retaino.

## Allowed use

Campaigns must promote the customer's own similar services to valid customer
contacts. The customer must have consent or another valid existing-customer basis
for each recipient before sending.

## Prohibited use

The customer must not send deceptive, unlawful, harassing, high-risk, or
third-party promotional messages. The customer must not import health notes,
journal notes, or other sensitive fields into Retaino.

## Opt-out handling

Every SMS must include a clear opt-out path. The customer must honor opt-outs and
must not message recipients who have opted out unless a later lawful opt-in is
recorded.

## Review and enforcement

Retaino may block imports, campaign approval, or sending when campaign data,
recipient status, content, or account behavior appears to violate this policy.
$mdx$, '614e69fc9d498d5a796d8c3d4020d1681d03c03a2e74cd53516ac687bc5db07d', 'published', '2026-05-05', '2026-05-05T00:00:00Z'),
  ((SELECT "id" FROM "legal_documents" WHERE "document_type" = 'campaign_attestation'), 'campaign_attestation', '2026-05-05', 'Retaino SMS Marketing Attestation', 'docs/legal/campaign-attestation-2026-05-05.md', $mdx$# Retaino SMS Marketing Attestation

Version: 2026-05-05
Effective date: 2026-05-05

By accepting this attestation for an organization, the customer confirms the
following statements for SMS campaigns prepared or sent through Retaino.

## Attested statements

- Recipients are the customer's own valid contacts.
- The customer has consent or a valid existing-customer basis for each recipient.
- Campaigns promote the customer's own similar services.
- No recipient has opted out.
- Every SMS includes a clear opt-out path.
- Imported data excludes health notes, journal notes, and other sensitive fields.

## Continuing obligation

The customer must keep these statements true for every import, audience, campaign
draft, campaign approval, and message send.
$mdx$, 'e5c54c25679868aae3e9be4d223722f7c8f84f25292659c03403771967a02513', 'published', '2026-05-05', '2026-05-05T00:00:00Z')
ON CONFLICT ("document_type", "document_version") DO UPDATE SET
  "legal_document_id" = excluded."legal_document_id",
  "title" = excluded."title",
  "body_mdx" = excluded."body_mdx",
  "content_hash" = excluded."content_hash",
  "status" = excluded."status",
  "effective_date" = excluded."effective_date",
  "published_at" = excluded."published_at",
  "updated_at" = now();
--> statement-breakpoint
ALTER TABLE "legal_document_versions" ALTER COLUMN "legal_document_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "legal_document_versions" ALTER COLUMN "body_mdx" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "legal_document_versions" ALTER COLUMN "status" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "legal_document_versions" DROP COLUMN "markdown_path";
--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_legal_document_id_legal_documents_id_fk" FOREIGN KEY ("legal_document_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "legal_document_versions_document_id_version_idx" ON "legal_document_versions" USING btree ("legal_document_id","document_version");
--> statement-breakpoint
CREATE INDEX "legal_document_versions_type_status_idx" ON "legal_document_versions" USING btree ("document_type","status");
--> statement-breakpoint
ALTER TABLE "organization_acceptances" ADD COLUMN "legal_document_version_id" uuid;
--> statement-breakpoint
ALTER TABLE "organization_acceptances" ADD COLUMN "content_hash" text;
--> statement-breakpoint
UPDATE "organization_acceptances" AS acceptance
SET
  "legal_document_version_id" = version."id",
  "content_hash" = version."content_hash"
FROM "legal_document_versions" AS version
WHERE acceptance."document_type" = version."document_type"
  AND acceptance."document_version" = version."document_version";
--> statement-breakpoint
ALTER TABLE "organization_acceptances" ALTER COLUMN "legal_document_version_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "organization_acceptances" ALTER COLUMN "content_hash" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "organization_acceptances" ADD CONSTRAINT "organization_acceptances_legal_document_version_id_legal_document_versions_id_fk" FOREIGN KEY ("legal_document_version_id") REFERENCES "public"."legal_document_versions"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_acceptances_org_document_version_idx" ON "organization_acceptances" USING btree ("organization_id","legal_document_version_id");
