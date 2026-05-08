# Contacts API Plan

This temporary plan defines contacts import API shape, endpoint responsibilities,
and access rules.

## Access and Setup Gates

Contacts are organization-owned. Every endpoint and background job must resolve
and use `organizationId`.

Import actions should require an admin-level organization role for MVP. Members
can view contacts if product permissions allow it, but upload, process, and
destructive import actions should start restricted.

The contacts import API must respect organization setup state:

- If profile or compliance setup is incomplete, do not allow import processing.
- API endpoints must enforce setup checks. UI checks are not enough.
- Request body organization IDs are untrusted and must not control tenant scope.

Use shared permission helpers. Do not scatter raw role string checks across
routes.

## Endpoints

Suggested endpoints:

- `GET /v1/contacts`
- `GET /v1/contact-imports`
- `POST /v1/contact-imports`
- `GET /v1/contact-imports/:id`
- `POST /v1/contact-imports/:id/process`
- `GET /v1/contact-imports/:id/rows`

## Endpoint Responsibilities

`GET /v1/contacts`

- Returns the paginated contact list.
- Computes and returns `contactStatus` and `contactIssues`.
- Supports server-side search, filters, sorting, and pagination.

`GET /v1/contact-imports`

- Returns import history and processing status for the active organization.
- Supports pagination and status filters.

`POST /v1/contact-imports`

- Validates upload metadata and file limits.
- Stores the uploaded CSV in R2.
- Creates the `contact_imports` row.
- Parses a small preview only.
- Returns detected headers and sample rows for mapping.
- Does not process the full file or create contacts.

`GET /v1/contact-imports/:id`

- Returns one import detail.
- Includes status, counts, mapping, preview when useful, and error summary.
- Must require the import to belong to the active organization.

`POST /v1/contact-imports/:id/process`

- Accepts confirmed mapping and `phoneCountryCode`.
- Validates the mapping with zod.
- Stores mapping and `phoneCountryCode`.
- Moves the import into processing.
- Emits the background job event.
- Does not process the full CSV inside the HTTP request.

`GET /v1/contact-imports/:id/rows`

- Returns paginated row-level import results.
- Used for invalid, suppressed, duplicate, and skipped rows.
- Supports row status filters.

## Contracts

All request and response payloads should use zod schemas from
`@retaino/shared`.

Suggested contracts:

- contact list query
- contact list response
- contact import summary
- contact import detail
- create contact import response with preview
- process contact import input
- contact import row list query
- contact import row list response

## API Structure

- Add contacts routes under `apps/api/src/features/contacts/`.
- Keep route handlers thin.
- Put business logic in services when route logic becomes non-trivial.
- Use database query functions from `packages/db`.
- Do not write inline SQL in route handlers.
- Full import processing must run in the background job.
