# Architecture

Retaino is a multi-tenant SaaS for SMS-based customer reactivation.

## Docs Map

- `docs/product.md`: product scope, workflows, campaign, inbox, tracking, and reporting rules.
- `docs/compliance.md`: legal, privacy, suppression, retention, and audit rules.
- `docs/pricing.md`: plans, credit ledger, Stripe, and send authorization rules.

`docs/landing-page-research.md` is research material, not agent operating guidance.

## Stack

- Web: Next.js App Router on Vercel.
- API: Hono on Cloudflare Workers.
- Auth: Clerk Organizations.
- Database: Neon Postgres, Drizzle schema, migrations, and query layer in `packages/db`.
- Payments: Stripe.
- Background jobs: Inngest.
- SMS provider: Twilio behind Retaino provider adapters.
- Shared contracts and cross-package helpers: `packages/shared`.

## Tenant Boundary

Organizations are the tenant boundary. Product data belongs to organizations, not users. User IDs identify actors.

Every authenticated API request must verify the user, resolve the active Clerk organization, verify membership, resolve the internal `organizationId`, and pass that ID into services and queries. Request body organization IDs are untrusted.

MVP roles:

| Role | Meaning |
| --- | --- |
| `org:admin` | Manages setup, team access, billing, and organization settings. |
| `org:member` | Builds, tests, sends, replies, and reviews campaigns after setup is complete. |

Rules:

- Every tenant-owned table includes `organizationId`.
- Every tenant-scoped query requires `organizationId`.
- Never load, mutate, or authorize tenant-owned resources by ID alone.
- Use shared permission helpers instead of scattered role string checks.
- Database access belongs in `packages/db`, not inline route SQL.
- Cross-app schemas, constants, and helpers belong in `packages/shared`.

## Runtime And Environments

The Cloudflare API connects to Neon through the `HYPERDRIVE` binding using `pg` and Drizzle's node-postgres adapter. Local API development uses Hyperdrive's local connection-string override in `apps/api/.env.local`.

Drizzle Kit migrations and database scripts use `packages/db` with a direct `DATABASE_URL`. Never run migrations through Hyperdrive. Never manually edit generated migration SQL or metadata, update the Drizzle schema and run the project migration command.

Keep environments separate:

- Local development uses development database, development Clerk, and Stripe test mode.
- Deployed Cloudflare and Vercel environments use production database, production Clerk, and Stripe live mode.
- Do not point deployed environments at development services.
- Do not point local development at production services unless explicitly requested for a one-off operation.

## Background Jobs

Long-running work runs in Inngest jobs, not HTTP requests.

Job payloads include `organizationId`, actor `userId` when present, and source resource IDs. Jobs re-read data by `organizationId` plus resource ID. Store large job inputs in private object storage under organization-scoped keys, and pass identifiers in job payloads.

## API Structure

- `src/server.ts` composes routes and global error handling.
- Operational endpoints, such as `/health`, stay separate from product routes.
- Product code lives in `src/features/<feature>/`.
- Use `<feature>.routes.ts` for thin HTTP handlers.
- Use `<feature>.service.ts` for business logic.
- Provider adapters and shared errors live in `src/lib/`.
- Request context, auth, and guards live in `src/middleware/`.
- Validate request and response shapes with shared contracts where they exist.

## Web Structure

Use App Router route groups by intent:

- `src/app/(marketing)/...`
- `src/app/(auth)/...`
- `src/app/(app)/...`

Feature modules live under `src/features/<feature>/`:

- `components` contains `.tsx` component files only.
- `hooks` contains files named `use-*.ts` or `use-*.tsx` only.
- Pure feature helpers, constants, formatters, query keys, and types live directly under the feature folder.
- Do not add feature `lib` folders.

Shared frontend utilities live in `src/lib/`. Shared hooks used by multiple features live in `src/hooks/`. Compose generated shadcn primitives from feature code instead of editing generated files directly.

Application forms use TanStack Form unless an explicit exception is approved.

## App UI Rules

- Use `ItemTitle` and `ItemDescription` for standard item title and subtitle text.
- Put item title and subtitle text above a self-contained panel. Keep the panel focused on content.
- Use `ItemNotice` for inline item notices instead of `Alert` inside app items.
- Use `textStyles` from `src/lib/text-styles.ts` for repeated text roles.
- Never design cards inside cards. Use sections, lists, tables, split layouts, or direct item content.
- Lists and tables should own their border directly, not sit inside another framed item.
- Status badges use a neutral pill with state carried by the icon.
- Do not repeat the page title as a page-header eyebrow.
- Use the plain shadcn Sonner wrapper with state-specific toast calls. Do not add custom Sonner icons, rich colors, toast class overrides, or extra radius styling.

Run after relevant web UI changes:

```powershell
pnpm --filter @retaino/web contrast:check
pnpm --filter @retaino/web ui:audit
```

## Caching

TanStack Query is the primary cache for authenticated app data. All tenant-scoped query keys must include the active Retaino `organizationId`.

Use previous-page behavior for paginated lists where possible. Invalidate by organization-prefixed keys after mutations that affect multiple pages or filters.

Do not cache these in frontend, Next, Worker memory, or backend response caches:

- auth decisions
- active organization membership checks
- suppression checks before sends or replies
- audit reads or writes used as proof of action
- import processing writes
- campaign send eligibility
- provider webhook processing decisions
- results whose correctness depends on current suppression, consent, or membership state

Next data cache is only for public or low-risk reference data unless keys are explicitly tenant-scoped and invalidation is clear. Cloudflare Worker memory is per isolate and not durable, so never use it for tenant-scoped mutable product data.

Before adding backend caches, improve query shape with indexes, selective columns, stable pagination, and aggregate summaries.

## SMS Provider

Twilio is the MVP SMS provider. Product features depend on Retaino message contracts, not Twilio SDK types or webhook payloads.

The adapter owns sender provisioning, sender readiness, outbound sends, inbound replies, delivery events, segment counts, provider errors, and webhook verification. Provider credentials stay in environment bindings. Tenant-owned tables store only provider references, sender state, selected country, phone number, failure reason, and timestamps.

Each organization gets one dedicated two-way SMS-capable sender number and one provider sender group before real sends. Do not use a shared Retaino sender number or one-way alphanumeric sender IDs in MVP.

Sender provisioning is lazy and idempotent. Organizations can create campaigns and preview audiences before a sender exists, but test sends, live sends, and manual inbox replies require an active subscription, current legal acceptance, and a ready sender.

Sender numbers are retained only while the organization has paid subscription access. If a subscription is canceled for period end, keep the sender until the paid period ends. If payment becomes past due, block outbound SMS and schedule release after three days unless payment recovers. If the subscription is canceled, unpaid, paused, or incomplete expired, schedule release immediately. Release the provider phone number before deleting the provider sender group so the recurring number cost stops. Do not recycle released numbers between Retaino organizations, and do not promise the same number after resubscription.

Provider callbacks are configured at sender-group level:

- Inbound webhook: `https://api.retaino.io/v1/webhooks/twilio/messaging/inbound`
- Status webhook: `https://api.retaino.io/v1/webhooks/twilio/messaging/status`

Webhook rules:

- Validate Twilio webhooks from the raw request URL and raw request body.
- Accept future Twilio parameters without hard-coded payload allow lists.
- Store raw provider payloads in `campaign_message_events`.
- Inbound SMS webhooks return empty TwiML: `text/xml` with `<Response></Response>`.
- Do not use TwiML replies from inbound webhooks for manual replies.
- Do not use Twilio Conversations product in MVP. Retaino owns the conversation model.

Inbound SMS handling:

- Match the organization sender by provider sender reference.
- If the sender cannot be matched, log or track the ignored state internally and still return empty TwiML.
- Store inbound text in `sms_messages`.
- Attach latest matching campaign recipient context by phone hash when available.
- STOP-style replies create phone suppressions immediately.
- If inbound media fields are present, store the text body and raw payload, ignore the media attachment, and do not fail the webhook. Full MMS is deferred.

## Message Ledger

`sms_messages` is the canonical SMS ledger for outbound campaign sends, inbound replies, and manual replies. Feature read models derive from it instead of duplicating message state.

Conversation threading uses phone identity:

- Primary key: `organizationId + phoneHash`.
- `sms_messages` stores nullable `phoneHash`, `normalizedPhone`, and `idempotencyKey`.
- `sms_conversations` stores mutable conversation state only, currently `lastReadAt`.
- Conversation and message queries must always include `organizationId`.
- Suppression state comes from `suppressions`, not duplicated conversation columns.

Message idempotency:

- Keep provider message uniqueness for callback idempotency.
- Use unique `organization_id + idempotency_key` for operation retry safety.
- Do not restore campaign-recipient-direction uniqueness. It prevents repeated inbound replies and manual replies.
- PostgreSQL allows multiple nulls in a unique index, so messages without idempotency keys are valid.

Manual reply failure boundary:

- If provider send fails before acceptance, mark the queued message failed and release reserved credits.
- If provider send succeeds but a later database write fails, do not mark the message failed and do not release credits. The customer may already have received the SMS.
- Existing manual reply rows with the same idempotency key must not trigger another provider send.
- Existing failed manual reply rows with the same idempotency key should return the original failure behavior, not silently send again.

## URLs

Authenticated app routes use `/app/...` and are scoped by the active organization.

Public recipient links use `https://go.retaino.io/r/:code`. Tracking link lookup resolves organization from the stored link record, not from the URL.
