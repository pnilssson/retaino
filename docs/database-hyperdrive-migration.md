# Database Hyperdrive Migration

This note records the planned database runtime change for the API and the query
cleanup that should happen with it.

## Goal

Move the API database runtime from Neon HTTP queries to Cloudflare Hyperdrive
with a standard PostgreSQL driver.

Target runtime stack:

```text
Cloudflare Worker
  -> Hyperdrive binding
  -> Neon direct PostgreSQL endpoint
  -> pg Client
  -> drizzle-orm/node-postgres
```

Drizzle Kit migrations continue to use a direct `DATABASE_URL`, not Hyperdrive.

## Why

The current database client uses `@neondatabase/serverless` HTTP with
`drizzle-orm/neon-http` in `packages/db/src/client.ts`.

That driver does not support Drizzle interactive transactions. The campaign
send flow calls `launchCampaign`, which uses `db.transaction`, so local campaign
send fails before the campaign leaves `draft`.

We also already shaped some queries around this limitation. Moving to a proper
transaction-capable runtime lets the database module express the domain rules
directly:

- campaign launch is atomic
- campaign send start is atomic
- credit reservation is serialized by durable database state
- booking report creation is atomic
- idempotency is enforced with constraints instead of fragile application locks

## Research Summary

Cloudflare recommends Hyperdrive for SQL databases from Workers because it
manages database pooling across Cloudflare regions and avoids reconnect
overhead per Worker invocation.

Cloudflare's Hyperdrive Drizzle example uses `pg` with
`drizzle-orm/node-postgres`, plus a Hyperdrive binding named `HYPERDRIVE`.

Neon explicitly says not to combine Hyperdrive with Neon pooling or the Neon
serverless driver. Hyperdrive should connect to the direct Neon PostgreSQL
endpoint through standard drivers such as `node-postgres` or `Postgres.js`.

Cloudflare Hyperdrive supports Neon, PostgreSQL TLS, and `node-postgres`, but
does not support PostgreSQL advisory locks. This matters because the current
query layer uses `pg_advisory_xact_lock`.

References:

- https://developers.cloudflare.com/workers/databases/connecting-to-databases/
- https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/
- https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/
- https://developers.cloudflare.com/hyperdrive/configuration/local-development/
- https://developers.cloudflare.com/hyperdrive/reference/supported-databases-and-features/
- https://neon.com/blog/hyperdrive-neon-faq

## Current DB Runtime

Runtime database access is centralized in `packages/db/src/client.ts`:

```ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
```

API entry points create a database client in:

- `apps/api/src/middleware/db.ts`
- `apps/api/src/features/contacts/contacts.jobs.ts`
- `apps/api/src/features/campaigns/campaigns.jobs.ts`
- `apps/api/src/features/billing/billing.webhook-routes.ts`

The API already has `nodejs_compat` enabled in `apps/api/wrangler.toml`, which
is required for `pg`.

## Query Audit

### Uses Real Transactions

These should stay transactional after the migration:

- `packages/db/src/queries/campaigns.ts`
  - `launchCampaign`
  - `startCampaignSend`
- `packages/db/src/queries/booking-reports.ts`
  - `createManualBookingReport`

These transactions are good domain seams. The issue is the current runtime, not
the idea that these operations should be atomic.

### Uses Advisory Locks

These must change before Hyperdrive can be the only runtime path:

- `packages/db/src/queries/billing.ts`
  - `reserveSmsCreditsIfSufficient`
  - current lock: `pg_advisory_xact_lock(hashtext(organizationId))`
- `packages/db/src/queries/campaigns.ts`
  - `startCampaignSend`
  - current lock: `pg_advisory_xact_lock(hashtext(organizationId))`

Hyperdrive does not support advisory locks, so these locks should be replaced
with row locks, constraints, or both.

### Queries Built Around Idempotency

These are useful patterns and should be kept or strengthened:

- `billingWebhookEvents.stripeEventId` unique index for webhook idempotency
- `smsCreditTransactions.source/sourceId/creditBucket` unique index for ledger
  idempotency
- `trackingLinks.organizationId/recipientId` unique index for recipient link
  idempotency
- `smsMessages.organizationId/campaignId/recipientId/direction` unique index
  for outbound message idempotency
- provider message unique indexes for callback idempotency
- contact and suppression unique indexes for import and opt-out idempotency

## Required Query Redesign

### Credit Reservation

Current shape:

- single raw CTE
- advisory lock on organization ID
- calculates spendable balance
- inserts subscription-period debit and purchased debit rows
- falls back to reading existing reservation rows for idempotent retries

Target shape:

- run inside a real transaction
- lock the organization's billing profile row with `FOR UPDATE`
- calculate spendable balance inside that transaction
- insert ledger debit rows with existing unique idempotency keys
- return existing reservation rows for retries

The row lock should be on `organization_billing_profiles` because that row is
the local subscription projection and already has one row per organization.
If we need credit reservation for an organization before a profile exists, add a
small explicit lock table instead of returning to advisory locks.

This makes the credit reservation rule local to durable business state instead
of a session-level lock.

### Active Campaign Send

Current shape:

- transaction
- advisory lock on organization ID
- query for another `sending` campaign
- update this campaign from `ready_to_send` to `sending`

Target shape:

- add a partial unique index that allows only one `sending` campaign per
  organization
- remove advisory lock
- update the target campaign from `ready_to_send` to `sending`
- map unique constraint failure to `active_send_exists`

Suggested schema invariant:

```text
unique organization_id where campaigns.status = 'sending'
```

This is stronger than the current application check. The database becomes the
source of truth for the "one active send per organization" rule.

### Campaign Launch

Current shape:

- transaction
- read draft campaign
- read eligible contacts
- update campaign to `ready_to_send`
- insert recipient snapshots in batches
- insert audit log

Target shape:

- keep transactional behavior
- consider locking the campaign row with `FOR UPDATE` rather than relying only
  on `updatedAt` optimistic concurrency
- consider inserting campaign recipients with `insert into ... select ...`
  instead of selecting eligible contacts into application memory first
- add or confirm a uniqueness invariant for campaign recipient snapshots if
  repeated launch attempts become possible

This would reduce round trips and keep snapshot logic closer to the database.

### Booking Reports

Current shape:

- transaction
- reads campaign reportability
- reads existing currency
- reads organization profile currency
- prepares rows in application code
- inserts report, reported bookings, and audit log

Target shape:

- keep transactional behavior
- no Hyperdrive blocker found
- optional cleanup: lock campaign row while creating the report if we need to
  prevent reportability changing mid-request

### Contact Import

Current shape:

- per-row contact lookup by phone hash and email hash
- application-level conflict resolution
- insert or update contact
- unique indexes protect phone and email hashes

Target shape:

- no Hyperdrive blocker found
- optional cleanup: batch more of the import work where possible
- keep conflict handling explicit because phone and email can point to different
  contacts and that is a domain decision, not just a database upsert

### Read Queries

The read-side query layer can remain mostly unchanged.

Potential follow-up improvements:

- combine contact list rows, total count, and suppression status when that page
  becomes a performance bottleneck
- combine campaign audience preview counts if preview latency becomes visible
- keep report aggregate SQL in `campaign-reports.ts`, because it is already a
  deep query module with a small interface

## Runtime Implementation Changes

### Dependencies

Add to the correct package manifest:

- `pg` to `packages/db`
- `@types/pg` to `packages/db` dev dependencies

Remove `@neondatabase/serverless` only after no runtime, script, or migration
path imports it.

### DB Client Interface

`packages/db/src/client.ts` should expose a runtime client creation path that
accepts a connection string from either:

- Hyperdrive binding connection string in Workers
- direct development database URL outside Hyperdrive

The DB module should own the driver adapter. Callers should not need to know
whether the connection came from Hyperdrive or direct local configuration.

### API Bindings

Add a Hyperdrive binding to `apps/api/wrangler.toml`:

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<production-hyperdrive-id>"
```

Update `apps/api/src/types.ts` with the `HYPERDRIVE` binding.

Local development should use:

```text
CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
```

That value must point to development Neon, not production Neon.

### Connection Lifecycle

With `pg`, create a client per request or job execution using the Hyperdrive
connection string. Cloudflare documents this as the expected pattern because
Hyperdrive owns the underlying pool.

Close the client after the request or job finishes.

Places to update:

- `apps/api/src/middleware/db.ts`
- `apps/api/src/features/contacts/contacts.jobs.ts`
- `apps/api/src/features/campaigns/campaigns.jobs.ts`
- `apps/api/src/features/billing/billing.webhook-routes.ts`

The connection lifecycle should be hidden behind a small API module helper or
middleware, not repeated differently in every route and job.

### Migrations

Do not run migrations through Hyperdrive.

Keep Drizzle Kit using a direct `DATABASE_URL`. This preserves the current
project rule:

- schema changes are made in Drizzle schema
- migrations are generated by the project command
- migration SQL and metadata are not edited manually

## Implementation Order

1. Add schema-level invariants that replace advisory locks.
2. Refactor `reserveSmsCreditsIfSufficient` to use transactions and row locks.
3. Refactor `startCampaignSend` to rely on the partial unique index instead of
   an advisory lock.
4. Switch the runtime DB adapter to `pg` and `drizzle-orm/node-postgres`.
5. Add the Hyperdrive binding and local development configuration.
6. Update API request and job connection lifecycle.
7. Remove unused Neon HTTP imports and dependencies.
8. Run database, API, and migration verification.

## Verification Plan

Minimum verification after implementation:

- `pnpm --filter @retaino/db typecheck`
- `pnpm --filter @retaino/db lint`
- `pnpm --filter @retaino/db test`
- `pnpm --filter @retaino/api typecheck`
- `pnpm --filter @retaino/api lint`
- targeted API campaign, billing, contact import, and booking report tests
- `pnpm --filter @retaino/api build`

Manual runtime checks should cover:

- contact import job reads and writes through the new client
- billing webhook idempotency
- test SMS debit and release behavior
- campaign launch from draft
- final campaign send queueing
- background campaign send processing
- report creation after campaign completion

Do not run these against production data from local development.

## Open Decisions

- Should `packages/db` expose one `createDb` that always requires an already
  connected client, or expose a helper that creates and closes a `pg` client?
- Should we name the binding `HYPERDRIVE` or `DATABASE`? Cloudflare examples use
  `HYPERDRIVE`, but `DATABASE` may read better in our API code.
- Should credit reservation lock `organization_billing_profiles`, or should we
  add a dedicated `organization_credit_locks` table to avoid depending on a
  billing profile row always existing?
- Should campaign launch be optimized to `insert into campaign_recipients ...
  select ...` in this migration, or kept as a follow-up after the driver change?
