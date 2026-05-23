# Database Hyperdrive Migration

This is the implementation plan for moving API database access from Neon HTTP
queries to Cloudflare Hyperdrive with a transaction-capable PostgreSQL driver.

Verified against Cloudflare Hyperdrive documentation on 2026-05-23.

## Decision

Use Cloudflare Hyperdrive with `pg` and `drizzle-orm/node-postgres` for the API
runtime.

Target runtime stack:

```text
Cloudflare Worker
  -> Hyperdrive binding
  -> Neon direct PostgreSQL endpoint
  -> pg Client
  -> drizzle-orm/node-postgres
```

Keep Drizzle Kit migrations on a direct `DATABASE_URL`. Do not run migrations
through Hyperdrive.

Use the Hyperdrive binding name `HYPERDRIVE`. This matches Cloudflare examples
and keeps local development configuration predictable:

```text
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
```

## Branch Status

This branch implements the code migration:

- `packages/db` uses `pg` and `drizzle-orm/node-postgres`.
- API requests, Inngest jobs, Stripe webhook routes, and the legal publishing
  script create `pg` clients from the DB package.
- The API runtime uses the `HYPERDRIVE` binding only. Local development should
  use Hyperdrive's local connection string override.
- Advisory locks have been removed from runtime queries.
- Campaign concurrency and recipient snapshot idempotency are enforced by
  generated database indexes.
- `apps/api/wrangler.toml` binds `HYPERDRIVE` to the production Hyperdrive
  config for the Neon `production` branch.

## Why

The previous runtime client in `packages/db/src/client.ts` used:

```ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
```

`drizzle-orm/neon-http` does not support interactive transactions. The campaign
send flow calls `launchCampaign`, which uses `db.transaction`, so a local send
can fail before the campaign leaves `draft`.

The previous query layer also contained advisory locks to compensate for missing
transaction support. Hyperdrive does not support PostgreSQL advisory locks, so
those locks had to be replaced with durable database invariants.

## Confirmed Platform Constraints

- Cloudflare Workers can use Hyperdrive with `pg` when `nodejs_compat` is
  enabled.
- `apps/api/wrangler.toml` already has `nodejs_compat`.
- Cloudflare's Drizzle example uses `pg`, `drizzle-orm/node-postgres`, and a
  Hyperdrive binding.
- Hyperdrive should connect to the direct Neon PostgreSQL endpoint, not a Neon
  pooled endpoint.
- Do not combine Hyperdrive with `@neondatabase/serverless`.
- Hyperdrive does not support PostgreSQL advisory locks.
- Local development must point to development Neon only.
- Deployed Cloudflare environments must point to production Neon only.

References:

- https://developers.cloudflare.com/workers/databases/connecting-to-databases/
- https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/
- https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/
- https://developers.cloudflare.com/hyperdrive/configuration/local-development/
- https://developers.cloudflare.com/hyperdrive/reference/supported-databases-and-features/
- https://neon.com/blog/hyperdrive-neon-faq

## Previous Repo State

Runtime database access is centralized in `packages/db/src/client.ts`.

API entry points that create a DB client:

- `apps/api/src/middleware/db.ts`
- `apps/api/src/features/contacts/contacts.jobs.ts`
- `apps/api/src/features/campaigns/campaigns.jobs.ts`
- `apps/api/src/features/billing/billing.webhook-routes.ts`

Scripts that create a DB client:

- `packages/db/src/scripts/publish-legal-documents.ts`

Queries that needed real transaction support:

- `packages/db/src/queries/campaigns.ts`
  - `launchCampaign`
  - `startCampaignSend`
- `packages/db/src/queries/booking-reports.ts`
  - `createManualBookingReport`

Queries that used advisory locks before this migration:

- `packages/db/src/queries/billing.ts`
  - `reserveSmsCreditsIfSufficient`
  - previous lock: `pg_advisory_xact_lock(hashtext(organizationId))`
- `packages/db/src/queries/campaigns.ts`
  - `startCampaignSend`
  - previous lock: `pg_advisory_xact_lock(hashtext(organizationId))`

Those advisory locks were blockers for Hyperdrive and have been removed in this
branch.

## Target DB Client Contract

`packages/db` should own the driver choice. API code should not import `pg` or
Drizzle driver adapters directly.

Expose two primitives:

- `createDb(client)`: creates a Drizzle client from an already connected `pg`
  client. This keeps the adapter testable.
- `connectDb(connectionString)`: creates a `pg` client, connects it, returns
  `{ db, close }`.

The returned `db` remains the only object query functions receive. The returned
`close` function is mandatory for direct scripts that run outside Workers.
Cloudflare owns Hyperdrive connection cleanup for Worker requests and jobs.

The API should resolve its connection string in one place:

1. Use `env.HYPERDRIVE.connectionString`.
2. Fail when the Hyperdrive binding is missing.

Do not duplicate this resolution in every route or job.

## Target API Connection Lifecycle

Create one `pg` client per request or job execution. Hyperdrive owns underlying
pooling and Worker cleanup.

Implementation points:

- `apps/api/src/middleware/db.ts` creates the request DB connection for public
  DB-backed routes.
- `apps/api/src/middleware/auth.ts` creates the DB connection for authenticated
  routes after Clerk authenticates the request.
- Contacts and campaigns Inngest jobs create their own DB connection inside the
  job step that touches the database.
- Billing webhook routes currently bypass the DB middleware, so they need the
  same DB creation handling.
- Scripts using `packages/db` should close the connection in `finally`.

The connection string resolution should be shared through a small API helper.
Do not hand-roll different binding lookup patterns in each caller.

## Query Changes

### Credit Reservation

Current behavior:

- Builds a single raw SQL CTE.
- Locks by organization with an advisory lock.
- Calculates available subscription-period and purchased credits.
- Inserts debit ledger rows.
- Falls back to existing reservation rows for idempotent retries.

Target behavior:

- Remove the advisory lock.
- Run the reservation inside a real transaction.
- Lock the organization's billing profile row with `FOR UPDATE`.
- Calculate the spendable balance after the row lock is held.
- Insert debit ledger rows with the existing idempotency keys.
- Return existing reservation rows for idempotent retries.

Lock `organization_billing_profiles` because that table is the local billing
projection and already has a unique row per organization. If we later need
credit reservation before a billing profile exists, add an explicit
organization credit lock table. Do not use advisory locks again.

Keep this existing invariant:

```text
unique source, source_id, credit_bucket on sms_credit_transactions
```

### Active Campaign Send

Current behavior:

- Starts a transaction.
- Locks by organization with an advisory lock.
- Checks for another `sending` campaign.
- Updates the target campaign from `ready_to_send` to `sending`.

Target behavior:

- Add a partial unique index that allows one `sending` campaign per
  organization.
- Remove the advisory lock.
- Keep the user-friendly pre-check for another active send.
- Update the target campaign from `ready_to_send` to `sending`.
- Map PostgreSQL unique constraint error `23505` on that index to
  `active_send_exists`.

Required schema invariant:

```text
unique organization_id on campaigns where status = 'sending'
```

This moves the "one active send per organization" rule into the database, where
concurrent sends cannot bypass it.

### Campaign Launch

Current behavior:

- Runs in a transaction.
- Reads the draft campaign.
- Reads eligible contacts into application memory.
- Updates the campaign to `ready_to_send`.
- Inserts recipient snapshots in batches.
- Inserts an audit log.

Target behavior for this migration:

- Keep the transaction.
- Keep the optimistic `updatedAt` guard unless implementation shows a simpler
  `FOR UPDATE` lock is cleaner with the new driver.
- Add a uniqueness invariant for recipient snapshots:

```text
unique campaign_id, contact_id on campaign_recipients where contact_id is not null
```

This protects repeated launch attempts for contacts with stable IDs. Contacts
without an ID can still be snapshotted because historical campaign recipients
may intentionally keep copied phone and email data.

Further cleanup, if it remains small in the same change:

- Replace application-side recipient snapshot batching with
  `insert into campaign_recipients ... select ...`.

Do this only if it keeps the code clearer. The driver migration must not become
a broad query rewrite for unrelated read paths.

### Booking Reports

Current behavior:

- Runs in a transaction.
- Reads campaign reportability.
- Reads existing report currency.
- Reads organization preferred currency.
- Inserts the report, reported bookings, and audit log.

Target behavior:

- Keep the transaction.
- No Hyperdrive blocker found.
- Do not change this query unless the driver adapter requires type fixes.

### Contact Import

Current behavior:

- Looks up contacts by phone hash and email hash.
- Resolves conflicts in application code.
- Inserts or updates contacts.
- Relies on unique indexes for phone and email hashes.

Target behavior:

- No Hyperdrive blocker found.
- Keep explicit conflict handling because phone and email can point to different
  contacts, and that is a domain decision.
- Do not rewrite contact import as a blind upsert.

## Schema And Migration Work

Schema changes were made in Drizzle schema first, then generated with the
project migration command.

Do not manually edit migration SQL or Drizzle metadata.

Generated schema changes:

- Add a partial unique index for one `sending` campaign per organization.
- Add a partial unique index for recipient snapshots by campaign and contact
  when `contact_id is not null`.

Command used:

```text
pnpm --filter @retaino/db db:generate
```

Run migrations only against the intended environment. Local development uses
development Neon. Production deployment uses production Neon.

## Dependency Changes

Added to `packages/db` dependencies:

- `pg`

Added to `packages/db` dev dependencies:

- `@types/pg`

Removed from `packages/db` dependencies:

- `@neondatabase/serverless`

Do not leave unused dependencies behind.

## Cloudflare Configuration

`apps/api/wrangler.toml` binds the production Hyperdrive config:

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "0bb96ea0a69d413aafc37de40e99ba76"
```

Local development should set this in `apps/api/.env.local`:

```text
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
```

The local value must point to development Neon. Keep Worker runtime secrets in
`apps/api/.dev.vars`; Hyperdrive's local connection string must be available to
Wrangler before the Worker starts.

After the Hyperdrive-backed API has been deployed and verified, remove the
legacy `DATABASE_URL` Worker secret from Cloudflare. Do not remove it before the
new deployment is active because the currently deployed Worker may still depend
on it.

## Implementation Order Used

1. Add `pg` and `@types/pg` to `packages/db`.
2. Add the campaign schema invariants in Drizzle schema.
3. Generate the migration with the project command.
4. Refactor `reserveSmsCreditsIfSufficient` to use a transaction and row lock.
5. Refactor `startCampaignSend` to use the partial unique index instead of an
   advisory lock.
6. Switch `packages/db/src/client.ts` to `pg` and
   `drizzle-orm/node-postgres`.
7. Update API request, job, webhook, and script connection lifecycle.
8. Add required `HYPERDRIVE` binding typing and centralized connection string
   resolution.
9. Remove `@neondatabase/serverless`.
10. Update tests that asserted advisory-lock SQL.
11. Run verification.

## Verification

Do not run web UI tests for this migration.

Run:

```text
pnpm --filter @retaino/db typecheck
pnpm --filter @retaino/db lint
pnpm --filter @retaino/db test
pnpm --filter @retaino/api typecheck
pnpm --filter @retaino/api lint
pnpm --filter @retaino/api build
```

Targeted behavior to verify with automated tests or direct local API checks:

- Credit reservation succeeds with enough credits.
- Credit reservation returns existing reservation rows for idempotent retries.
- Credit reservation rejects insufficient credits.
- Concurrent campaign send starts cannot create two `sending` campaigns for the
  same organization.
- Campaign launch can use `db.transaction`.
- Contact import jobs create DB connections through Hyperdrive.
- Campaign send jobs create DB connections through Hyperdrive.
- Billing webhook routes create DB connections through Hyperdrive.
- Legal document publishing creates and closes a DB connection.

Manual runtime checks, using development services only:

- Contact import job reads and writes through the new client.
- Billing webhook idempotency still works.
- Test SMS debit and release behavior still works.
- Campaign launch from draft succeeds.
- Final campaign send queues background work.
- Background campaign send processing reconciles credits.
- Report creation after campaign completion still works.

## Non Goals

- Do not rewrite read-side campaign, contact, or reporting queries unless the
  new driver requires it.
- Do not change Drizzle Kit migration execution to Hyperdrive.
- Do not introduce another DB abstraction outside `packages/db`.
- Do not point local development at production Neon.
- Do not point deployed Cloudflare environments at development Neon.
