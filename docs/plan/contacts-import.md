# Contacts Import Processing Plan

This temporary plan defines CSV upload, R2 storage, mapping, validation, dedupe,
and background processing.

## User Flow

1. User opens `/app/contacts`.
2. User uploads a CSV file.
3. API stores the raw file temporarily and creates a `contact_imports` row.
4. API parses only a small preview for header detection and sample rows.
5. User maps CSV columns to Retaino fields.
6. User confirms the mapping.
7. Background job processes the full file.
8. Retaino validates, normalizes, dedupes, checks suppressions, and imports
   contacts.
9. Contacts page shows import status and final counts.
10. Contacts list shows imported contacts and contact status.

## CSV Mapping

The mapping UI should show:

- detected CSV headers
- first few sample rows
- Retaino target fields
- required/optional field labels
- warnings for unmapped required fields

MVP target fields:

| Field | Required | Notes |
| --- | --- | --- |
| `name` | No | Display name when available. |
| `phone` | Recommended | Needed for SMS campaigns. |
| `email` | No | Useful for dedupe and booking reconciliation. |
| `lastBookingAt` | Recommended | Valuable for finding lapsed customers, but not required to import or contact a customer. |
| `lastService` | No | Latest known booked service, useful for relevant offers when available. |
| `consentStatus` | Recommended | Used for contact status. |
| `source` | No | Optional per-contact provenance label from the CSV, such as booking system, signup form, or manual list. |

At least one contact method must be present per row: phone or email. SMS
audiences require a valid phone number.

Do not use AI for CSV mapping in v1. Manual mapping is the source of truth.

## Storage

Decision: use Cloudflare R2 Standard storage for raw CSV files.

R2 fits the stack because the API runs on Cloudflare Workers, Workers can access
R2 through bindings, R2 is S3-compatible object storage, and lifecycle rules can
delete temporary raw uploads automatically.

Do not rely on memory for full imports.

Recommended behavior:

- Use a private R2 bucket for raw imports.
- Use object keys like
  `organizations/{organizationId}/contact-imports/{importId}/source.csv`.
- Store `fileKey`, filename, size, content type, checksum when available, and
  organization ID in Postgres.
- Parse preview in the upload request.
- Process the full file in a background job.
- Delete raw files after 30 days with an R2 lifecycle rule unless import history
  requires a shorter retention window.
- Enforce an MVP upload limit of 25 MB until large-file UX and streaming are
  hardened.

The raw file may contain customer data and must never be public.

Start with browser upload to the API, then API upload to R2. Add presigned R2
upload URLs later if larger files or upload reliability make that worthwhile.

R2 object metadata should include the import ID and organization ID when useful,
but Postgres remains the source of truth for import state.

## Validation

Validate each row after mapping:

- phone can be normalized when present
- email is valid when present
- at least one of phone or email exists
- SMS-ready contacts need a valid phone
- last booking date can be parsed when present, but missing last booking dates
  do not block import
- consent values are mapped to supported internal values
- `lastService` is stored only when the CSV clearly provides latest service or
  service category data
- unsupported sensitive fields are ignored and surfaced as warnings when
  detected by header names

Validation should return row-level errors and import-level counts.

Phone parsing should use `contact_imports.phoneCountryCode` for local-format
CSV phone numbers. `phoneCountryCode` defaults from the organization profile
`countryCode`, but the user can change it for an import. International numbers
with a leading `+` should still parse independently of the default country
hint.

Normalize phone and email before hashing. Hashes are deterministic matching
keys, not a replacement for access control. Raw values still need normal tenant
scoping and careful display rules.

## Dedupe

Dedupe must be organization-scoped.

Order:

1. Normalize phone and email.
2. Deduplicate inside the uploaded file.
3. Compare against existing contacts in the same organization.
4. Create new contacts when no match exists.
5. Update or merge existing contacts when a match exists.

Matching keys:

- phone hash
- email hash

Never dedupe across organizations.

## Import Processing Rules

Import processing must be idempotent. Retried jobs should not create duplicate
contacts or duplicate row results.

Rules:

- Process only imports that are in a valid state for processing.
- Use organization-scoped matching keys for contact upserts.
- Make row result writes stable by `contactImportId` and `rowNumber`.
- Update import counts from actual processed results, not only in-memory
  counters.
- A failed import should keep enough metadata and row errors for the user to see
  what happened.
- Reprocessing an import should be an explicit future action, not automatic UI
  behavior in MVP.

## Background Job

Use `inngest` for full CSV processing.

Job steps:

1. Load import row by `organizationId` and import ID.
2. Load raw file from R2.
3. Parse rows according to confirmed mapping with `csv-parse`.
4. Validate and normalize each row.
5. Check suppressions.
6. Dedupe inside the file.
7. Upsert contacts by organization-scoped phone/email hashes.
8. Write row-level results.
9. Update import counts and final status.
10. Schedule raw file deletion according to retention policy.
