# Contacts Data Model Plan

This temporary plan defines the prerequisite organization profile change and the
contacts database model.

## Prerequisite: Phone Country and Normalization

Before building contacts import, add organization country support and shared
phone normalization.

- Field: `countryCode`
- Format: ISO 3166-1 alpha-2, for example `SE`
- Default: `SE` for existing and new MVP organizations
- Editable from organization settings
- Collected during onboarding
- Required before contact import can run
- Used as the default country hint for local-format phone numbers

Implementation must update every organization profile surface:

- shared `organizationProfileSchema`
- shared `updateOrganizationProfileSchema`
- database `organizationProfiles` table and migration
- database profile query mapping and `upsertOrganizationProfile`
- API organization profile update route and tests
- web organization profile form values and validators
- onboarding company/profile step
- organization settings read-only profile summary
- organization settings edit form

Do not leave `countryCode` as an API-only or settings-only field. It must round
trip through onboarding, settings, API, shared contracts, and database storage
before contacts import work starts.

Add shared phone helpers using `libphonenumber-js`:

- parse phone numbers with an explicit default country hint
- normalize valid phone numbers to E.164
- return clear validation errors for invalid phone numbers
- preserve international numbers with a leading `+` based on their own country
  prefix

Use these helpers in every phone-number surface:

- onboarding responsible phone field
- organization settings responsible phone edit field
- contacts import row validation

`countryCode` is only a default parsing hint. It does not mean every owner or
contact phone number belongs to the organization's country.

Contacts import should also store the country hint used for that import:

- Field: `phoneCountryCode`
- Table: `contact_imports`
- Default: organization profile `countryCode`
- Editable in the import mapping/process step
- Used only for local-format phone numbers in that CSV

Examples:

- `+46701234567` parses as Sweden from the `+46` prefix.
- `+4512345678` parses as Denmark even if the organization `countryCode` is
  `SE`.
- `0701234567` needs a default country hint, usually the import
  `phoneCountryCode`.

## Shared Contracts

Add shared zod schemas, constants, and types for:

- contacts
- contact imports
- contact import rows
- suppressions
- import statuses
- row result statuses
- contact statuses
- contact issue codes
- CSV mapping payloads
- phone/email normalization helpers

Shared contracts belong in `packages/shared` and should be imported by both API
and web. Do not redefine contact/import types independently in apps.

## Tables

### `contacts`

Organization-owned, deduped contact records.

Suggested fields:

- `id`
- `organizationId`
- `name`
- `phone`
- `email`
- `normalizedPhone`
- `normalizedEmail`
- `phoneHash`
- `emailHash`
- `lastBookingAt`
- `lastContactedAt`
- `lastService`
- `consentStatus`
- `source`
- `createdFromImportId`
- `lastImportId`
- `createdAt`
- `updatedAt`

Rules:

- Every query must require `organizationId`.
- `phoneHash` and `emailHash` are for dedupe and matching.
- `lastContactedAt` is updated by future outbound message sends, not by import.
  It is a denormalized summary field for filtering and safety checks.
- Keep raw and normalized values separate.
- Do not store `contactStatus` or `contactIssues` on the contact in MVP. Return
  both as computed API fields derived from contact facts and suppressions.
- `lastService` is optional and means the latest known booked service, not a
  generic free-form profile category.
- `source` is optional per-contact provenance. Import-level source should also
  live on `contact_imports`.

`lastContactedAt` is not a replacement for history. When campaigns and messages
exist, the durable history should come from campaign recipient and message event
tables. The contact row keeps only the latest contact timestamp so lists and
audience filters can answer questions like "do not contact people messaged in
the last 30 days" without scanning the full event history.

### `contact_imports`

Tracks import lifecycle.

Suggested fields:

- `id`
- `organizationId`
- `createdByUserId`
- `status`
- `fileKey`
- `filename`
- `fileSize`
- `contentType`
- `checksum`
- `source`
- `phoneCountryCode`
- `mapping`
- `totalRows`
- `processedRows`
- `createdCount`
- `updatedCount`
- `skippedCount`
- `invalidCount`
- `duplicateCount`
- `suppressedCount`
- `errorSummary`
- `startedAt`
- `completedAt`
- `failedAt`
- `createdAt`
- `updatedAt`

Suggested statuses:

- `uploaded`
- `mapped`
- `processing`
- `completed`
- `failed`
- `canceled`

### `contact_import_rows`

Stores row-level results for user-visible errors and debugging.

Suggested fields:

- `id`
- `organizationId`
- `contactImportId`
- `rowNumber`
- `status`
- `contactId`
- `rawValues`
- `normalizedValues`
- `errors`
- `createdAt`

For privacy, prefer storing row results only for invalid, suppressed, duplicate,
and skipped rows in MVP. If successful row results are stored, keep only fields
needed for user feedback and support. Do not copy the entire raw CSV into
Postgres by default.

Suggested statuses:

- `created`
- `updated`
- `duplicate`
- `invalid`
- `suppressed`
- `skipped`

### `suppressions`

Organization-owned contact methods that must not be contacted.

Suggested fields:

- `id`
- `organizationId`
- `type`
- `value`
- `normalizedValue`
- `valueHash`
- `reason`
- `source`
- `createdAt`

Suppression types:

- `phone`
- `email`

## Indexes and Constraints

Add indexes and constraints with the first migration so import behavior is
enforced by the database, not only by application code.

Contacts:

- index on `organizationId`
- index on `organizationId, lastImportId`
- index on `organizationId, lastContactedAt`
- index on `organizationId, lastBookingAt`
- unique partial index on `organizationId, phoneHash` where `phoneHash` is not
  null
- unique partial index on `organizationId, emailHash` where `emailHash` is not
  null

Contact imports:

- index on `organizationId, createdAt`
- index on `organizationId, status`

Contact import rows:

- unique index on `organizationId, contactImportId, rowNumber`
- index on `organizationId, contactImportId, status`

Suppressions:

- unique index on `organizationId, type, valueHash`
- index on `organizationId, createdAt`

## Contact Status

Contact status should be derived from contact state and suppressions, not
manually edited by users.

Suggested `contactStatus` values:

- `ready`
- `blocked`
- `incomplete`

Return `contactIssues` from the API as an array of stable issue codes, not as a
stored display string.

`contactStatus` and `contactIssues` do not map 1:1. Status is the table summary.
Issues explain the details.

Suggested reason codes:

- `missing_phone`
- `invalid_phone`
- `suppressed_phone`
- `missing_consent`

The UI maps those codes to labels such as:

- Missing phone number
- Invalid phone number
- Suppressed
- Missing consent status

Status meaning:

- `ready`: the contact can be used for the current campaign or audience type.
- `blocked`: the contact should not be contacted, for example because the phone
  is invalid, consent is missing, or the phone is suppressed.
- `incomplete`: the contact is missing contactability data, such as a phone
  number.

For SMS campaign contact status, a contact needs:

- valid normalized phone
- not suppressed
- usable consent state
- organization setup and compliance complete

`lastBookingAt` should be stored when available because it powers
lapsed-customer filtering. Contacts without `lastBookingAt` can still be valid
contacts and can still be imported.
