# Contacts Test Plan

This temporary plan defines tests required for the contacts import MVP.

Add tests with implementation. Do not leave this feature verified only by manual
click-through.

## Shared Tests

- contact schema validation
- contact import schema validation
- contact status and issue derivation
- phone normalization with default country hints
- international phone normalization with `+` prefixes
- email normalization
- phone/email hashing helpers
- CSV mapping validation

## Database Tests

- tenant-scoped contact queries require `organizationId`
- dedupe upserts are organization-scoped
- duplicate phone hashes are rejected inside one organization
- duplicate email hashes are rejected inside one organization
- same phone/email hashes can exist in different organizations
- import row results are unique by import and row number
- suppressions are unique by organization, type, and value hash

## API Tests

- upload creates an import and stores file metadata
- upload returns preview rows only
- upload rejects missing active organization
- upload rejects incomplete organization setup
- upload rejects insufficient role
- process endpoint validates mapping
- process endpoint stores `phoneCountryCode`
- process endpoint emits the background job event
- contacts list returns computed `contactStatus` and `contactIssues`
- import rows endpoint returns row-level errors by status filter

## Background Job Tests

- valid rows create contacts
- existing contacts update instead of duplicating
- invalid rows create row errors
- suppressed rows are skipped
- duplicate rows are handled deterministically
- retrying the job is idempotent
- final import counts match row outcomes
- import status changes to completed or failed correctly

## Web Tests

- upload and mapping forms use TanStack Form
- contacts and import rows use TanStack Table with shadcn Table
- table state is URL-backed through `nuqs`
- setup blocked state renders clearly
- empty contacts state renders clearly
- processing state renders clearly
- completed import state renders clearly
- failed import state renders clearly
- filtered empty state renders clearly

## Repo Checks

Run:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
