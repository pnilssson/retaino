# Contacts Plan

This is the temporary implementation entry point for contacts import and contact
status.

When implementing, follow the order below and read each linked plan file before
writing code for that step. Do not skip ahead, because later work depends on the
data model and organization profile prerequisite.

## Goal

Build contacts import as the first real product workflow after organization
setup. Contacts, import validation, dedupe, suppression, and contact status are
tightly connected and should be implemented as one feature.

Do not use AI for CSV mapping in v1. Use a predictable Mailchimp/Brevo-style
manual mapping flow with detected headers, sample rows, and user confirmation.
AI can be added later as an optional mapping suggestion layer, but the user must
always confirm the mapping.

## Implementation Order

1. **Organization phone prerequisite**
   Read `docs/plan/contacts-data-model.md`.
   Add `countryCode` to organization profile schema, database, API, onboarding,
   organization settings, shared contracts, phone helpers, and tests.

2. **Shared contracts and database**
   Read `docs/plan/contacts-data-model.md`.
   Add shared schemas/constants, contact/import/suppression tables, indexes,
   constraints, and tenant-scoped query functions.

3. **API and storage**
   Read `docs/plan/contacts-import.md` and `docs/plan/contacts-api.md`.
   Add R2 upload/preview, import detail, process endpoint, contacts list, and
   import rows endpoints.

4. **Background import job**
   Read `docs/plan/contacts-import.md`.
   Add durable CSV processing, validation, normalization, dedupe, suppression
   checks, row results, final counts, and idempotency.

5. **Contacts UI**
   Read `docs/plan/contacts-ui.md`.
   Add `/app/contacts` as an operations screen with upload, mapping, import
   status, filters, and contacts table.

6. **Verification**
   Read `docs/plan/contacts-test-plan.md`.
   Add and run the tests listed there, then run repo checks.

## Scope

- Create organization-scoped contacts storage.
- Add CSV upload, preview, column mapping, validation, dedupe, and import result
  tracking.
- Track row-level import errors so users can understand what happened.
- Support suppression checks and invalid phone/email handling.
- Store consent/provenance fields and segmentable fields needed for campaigns.
- Add a basic contacts list with contact status indicators.
- Track `lastContactedAt` for the latest outbound message timestamp and keep
  detailed contact history through campaign/message records.

## Non-Goals

- No AI-powered mapping in v1.
- No booking-system integrations.
- No campaign sending.
- No full CRM feature set.
- No cross-organization dedupe or matching.
- No long-running CSV parsing inside HTTP requests.

## Package Decisions

Use the packages already installed in the monorepo where available. Add only the
packages called out here when the implementation needs them. Do not introduce
custom form, validation, fetching, table, CSV parsing, phone normalization, or
database patterns when a project-standard package already exists.

Add these packages for the contacts work:

- `libphonenumber-js` for phone parsing, validation, and E.164 normalization.
- `csv-parse` for CSV parsing. Do not write a custom CSV parser.
- `@tanstack/react-table` for contacts and import row table logic.
- `inngest` for durable background import processing.

Checked on 2026-05-08:

- `csv-parse`: latest `6.2.1`, published 2026-03-20, 12,917,384 weekly
  downloads, 4,266 GitHub stars, MIT.
- `libphonenumber-js`: latest `1.13.0`, published 2026-05-08, 15,861,541
  weekly downloads, 2,973 GitHub stars, MIT.

Alternatives checked:

- `fast-csv` is viable, but `csv-parse` has higher downloads, more stars, mature
  documentation, and strong CSV edge-case support.
- `google-libphonenumber` is acceptable, but `libphonenumber-js` is more widely
  used, actively maintained, TypeScript-friendly, and smaller/simpler for our
  needs.

## Access and Setup Gates

Contacts are organization-owned. Every endpoint and background job must resolve
and use `organizationId`.

Import actions should require an admin-level organization role for MVP. Members
can view contacts if product permissions allow it, but upload, process, and
destructive import actions should start restricted.

The contacts import screen should respect organization setup state:

- If profile or compliance setup is incomplete, show the contacts page in a
  blocked state with a clear action to finish setup.
- Do not allow import processing until organization setup and compliance are
  complete.
- API endpoints must enforce the same setup checks. UI checks are not enough.
