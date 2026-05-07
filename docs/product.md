# Product

Retaino v1 is a vertical SaaS for SMS-based customer reactivation. It is not a
generic SMS gateway, CRM, or booking system. The product promise is:

> Reactivate previous customers and show bookings and revenue, not just sent
> SMS.

## Target customers

Start with service businesses where one recovered booking has clear margin value
and the business already has a customer relationship:

- salons and beauty businesses
- aesthetic clinics, without importing health notes or journal data
- PT studios and small fitness studios
- car service, tire, and workshop businesses

Avoid broad SMB positioning in v1. The first product should work best for
businesses that already have customer lists and repeat booking behavior.

## Core use case

The user imports a customer list, selects lapsed customers, writes an SMS offer,
sends a campaign, and later sees which bookings and revenue can be attributed to
that campaign.

The dashboard should answer one question:

> How many bookings and how much revenue came from this campaign?

## V1 scope

Required for MVP:

- multi-tenant organization model using Clerk Organizations, as defined in
  `docs/tenancy.md`
- self-serve onboarding with terms, DPA, subprocessor notice, and campaign
  attestation
- CSV customer import with field mapping, validation, dedupe, and suppression
  checks
- lapsed customer segmentation rules, such as no booking in X days
- SMS editor with GSM-7/Unicode segment counter and cost preview
- per-recipient short links for click tracking
- campaign code or offer code for manual attribution
- campaign dashboard for sent, delivered, failed, clicked, replies, opt-outs,
  bookings, revenue, and attribution confidence
- STOP handling and suppression lists
- booking CSV upload and reconciliation
- strict tenant scoping for every imported, generated, and matched record

Nice to have in v1:

- UTM parameters for booking links and GA4-friendly exports
- one booking-system integration if access is practical, preferably Bokadirekt
  for the Swedish market

Defer until after MVP:

- full shared inbox or two-way support beyond STOP and basic reply routing
- email, WhatsApp, RCS, and broad omni-channel flows
- advanced automation or CDP functionality
- AI copy generation and experiment engines
- generic CRM features
- more than one or two booking integrations
- import of medical notes, journal data, or sensitive treatment notes

## Main flows

### Onboarding

1. User signs up or accepts an organization invitation.
2. Retaino ensures the user has an active organization.
3. User enters legal company identity, billing details, and responsible contact
   for that organization.
4. User accepts terms, DPA, subprocessor list, and transfer terms if relevant.
5. User confirms that imported recipients may be contacted for marketing.
6. User confirms that campaigns only market the customer's own similar services.
7. Retaino enables default STOP text and suppression handling.

### Audience import

1. User uploads a CSV customer list.
2. Retaino maps fields such as name, phone, email, last booking date, service,
   and consent or marketing status when available.
3. Retaino validates phone numbers and emails.
4. Retaino deduplicates records.
5. Retaino removes suppressed contacts.
6. Retaino stores normalized contact fields and hashes for matching.

### Campaign creation

1. User chooses a lapsed customer segment.
2. User writes SMS copy.
3. Retaino counts SMS segments and warns when Unicode would increase cost.
4. User chooses target booking URL and optional campaign code.
5. Retaino creates one tracked link per recipient.
6. User sends a test SMS.
7. User approves the live send.

### Campaign reporting

1. Retaino records sent time and provider delivery state.
2. Retaino records clicks on recipient short links.
3. User uploads booking export after the campaign.
4. Retaino matches bookings to recipients and classifies attribution.
5. Dashboard shows attributed bookings, revenue, confidence, and unmatched rows.

## Product principles

- Sell reactivation and revenue reporting, not cheap SMS transport.
- Be honest about attribution. Do not present inferred bookings as exact.
- Make SMS cost visible before sending.
- Keep long-running work in background jobs, including large imports, sends, and
  reconciliation jobs.
- Delete unused code, unused imports, and unused dependencies immediately.
- Shared schemas, constants, and matching utilities belong in `packages/shared`.

## Implementation map

Use the existing monorepo boundaries:

- `apps/web`: onboarding, imports, campaign builder, dashboard, booking upload
- `apps/api`: route handlers, auth checks, redirect endpoint, upload endpoints,
  webhook endpoints, and job triggers
- `packages/db`: Drizzle tables, migrations, and organization-scoped query
  functions
- `packages/shared`: zod schemas, campaign status values, attribution enums,
  phone/email normalization contracts, and SMS segment counting contracts

Feature modules should be shaped around:

- `organizations`
- `contacts`
- `imports`
- `campaigns`
- `messages`
- `links`
- `bookings`
- `attribution`
- `suppression`
- `billing`

HTTP handlers should stay thin. Campaign sending, CSV parsing, dedupe,
reconciliation, retention, and report aggregation should run in background jobs.
