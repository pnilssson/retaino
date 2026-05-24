# Architecture

Retaino is a multi-tenant SaaS for SMS-based customer reactivation.

## Related Docs

- `docs/product.md`: product scope and build order.
- `docs/campaigns.md`: campaign workflow and send rules.
- `docs/compliance.md`: legal, privacy, retention, and audit rules.
- `docs/caching.md`: cache policy and query-key rules.
- `docs/pricing.md`: plans, credit rules, and Stripe decisions.
- `docs/tracking.md`: short links and click tracking.
- `docs/reporting.md`: campaign metrics, reported bookings, and future
  attribution.

## Monorepo

- `apps/web`: Next.js App Router frontend on Vercel.
- `apps/api`: Hono API on Cloudflare Workers.
- `packages/db`: Drizzle schema, migrations, and query layer for Neon.
- `packages/shared`: cross-app schemas, contracts, constants, and helpers.
- `packages/eslint-config`: shared ESLint config.
- `packages/typescript-config`: shared TypeScript config.

## Tenant Boundary

Organizations are the tenant boundary. Product data belongs to organizations,
not users. User IDs identify actors.

Clerk Organizations own authentication, organization creation, membership,
invitations, active organization selection, and base roles. Retaino mirrors
users and organizations locally for stable product foreign keys. Do not add a
local membership mirror in MVP.

Every authenticated API request must verify the user, resolve the active Clerk
organization, verify membership, resolve the internal `organizationId`, and pass
that ID into services and queries. Request body organization IDs are untrusted.

MVP roles:

| Role | Meaning |
| --- | --- |
| `org:admin` | Manages setup, team access, billing, and organization settings. |
| `org:member` | Builds, tests, sends, and reviews campaigns after organization setup is complete. |

## Data Rules

- Every tenant-owned table includes `organizationId`.
- Every tenant-scoped query requires `organizationId` at the boundary.
- Never process tenant-owned resources by ID alone.
- Use shared permission helpers instead of scattered raw role string checks.
- Cross-app schemas, constants, and helpers belong in `packages/shared`.
- Database access comes from `packages/db`, not inline route SQL.

## Database Runtime

The Cloudflare API runtime connects to Neon through the `HYPERDRIVE` binding
using `pg` and Drizzle's node-postgres adapter. Local API development uses
Hyperdrive's local connection-string override in `apps/api/.env.local`.

Drizzle Kit migrations and database scripts use `packages/db` with a direct
`DATABASE_URL`. Do not run migrations through Hyperdrive.

## Background Jobs

Long-running work runs in Inngest jobs, not HTTP requests.

Job payloads include `organizationId`, actor `userId` when present, and source
resource IDs. Jobs re-read data by `organizationId` plus resource ID.

Store large job inputs, such as CSV uploads, in private object storage under
organization-scoped keys. Payloads should carry identifiers, not full files.

## SMS Provider

Twilio is the MVP SMS provider. Keep provider code behind an adapter so product
features depend on Retaino message contracts, not Twilio SDK types or webhook
payloads.

The adapter owns sender provisioning, sender readiness, outbound sends, inbound
replies, delivery events, segment counts, provider errors, and webhook
verification. Provider credentials stay in environment bindings. Tenant-owned
tables store only provider references, sender state, selected country, phone
number, failure reason, and timestamps.

Each organization gets one dedicated two-way SMS-capable sender number and one
provider sender group before real sends. Do not use a shared Retaino sender
number or one-way alphanumeric sender IDs in MVP.

Sender provisioning is lazy and idempotent. Organizations can create campaigns
and preview audiences before a sender exists, but test sends and live sends
require an active subscription, current legal acceptance, and a ready sender.

Onboarding collects company identity and address fields that can support sender
compliance. Sender setup asks users for sender country and phone number only.
Retaino chooses the provider number type needed for two-way SMS support.

Provider callbacks are configured at sender-group level. Inbound messages are
stored. STOP-style replies create suppressions immediately. Other replies are
retained for future inbox support.

## Billing

Stripe is the payment system of record. Retaino is the operational SMS credit
system of record.

- One Stripe customer maps to one Retaino organization.
- Admins can create subscription checkout, credit pack checkout, and portal
  sessions.
- Members can read billing status where useful, but cannot mutate billing.
- Stripe metadata must include the Retaino organization context needed by
  webhooks.
- Accepted webhook events are stored idempotently before side effects.
- Webhooks grant subscription-period credits, grant purchased credits, update
  local subscription projection, and record relevant refund adjustments.
- `organization_billing_profiles` stores the local Stripe subscription
  projection used to check whether an organization can spend SMS credits.
- SMS credit transactions are the immutable source of truth for credit grants,
  reservations, releases, usage, and adjustments. Available balance is derived
  from spendable ledger rows.
- Sends must reserve enough credits before provider cost is incurred, then
  reconcile estimated and actual usage after send completion.
- Do not use Stripe metered overage billing or Stripe Billing Credits for MVP
  send authorization.

Keep Stripe test mode local and Stripe live mode deployed. Never mix local
webhook secrets, development price IDs, or production services across
environments.

## API Structure

- `src/server.ts` composes routes and global error handling.
- Operational endpoints, such as `/health`, stay separate from product routes.
- Product code lives in `src/features/<feature>/`.
- Use `<feature>.routes.ts` for thin HTTP handlers.
- Use `<feature>.service.ts` for business logic.
- Provider adapters and shared errors live in `src/lib/`.
- Request context, auth, and guards live in `src/middleware/`.

## Web Structure

Use App Router route groups by intent:

- `src/app/(marketing)/...`
- `src/app/(auth)/...`
- `src/app/(app)/...`

Feature modules live under `src/features/<feature>/`:

- `components` contains `.tsx` component files only.
- `hooks` contains files named `use-*.ts` or `use-*.tsx` only.
- Pure feature helpers, constants, formatters, query keys, and types live
  directly under the feature folder.
- Do not add feature `lib` folders.

Shared frontend utilities live in `src/lib/`. Shared hooks used by multiple
features live in `src/hooks/`. Compose generated shadcn primitives from feature
code instead of editing generated files directly.

Application forms use TanStack Form unless an explicit exception is approved.

## App UI Rules

- Use `ItemTitle` and `ItemDescription` for standard item title/subtitle text.
- Put item title/subtitle text above the framed content when the content is a
  self-contained panel. Keep the panel focused on the content.
- Use `ItemNotice` for inline item notices instead of `Alert` inside app items.
- Use `textStyles` from `src/lib/text-styles.ts` for repeated text roles.
  Available roles are:
  - `pageTitle`
  - `pageDescription`
  - `sectionTitle`
  - `itemTitle`
  - `body`
  - `mutedBody`
  - `meta`
  - `metaStrong`
  - `numeric`
  - `metric`
  - `error`
- Never design cards inside cards. Use sections, lists, tables, split layouts,
  or direct item content.
- Lists and tables should own their border directly, not sit inside another
  framed item.
- Status badges use a neutral pill with state carried by the icon.
- Do not repeat the page title as a page-header eyebrow.
- Use the plain shadcn Sonner wrapper with state-specific toast calls. Do not
  add custom Sonner icons, rich colors, toast class overrides, or extra radius
  styling.

Run these UI quality checks after relevant web changes:

- `pnpm --filter @retaino/web contrast:check`
- `pnpm --filter @retaino/web ui:audit`

## URLs

Authenticated app routes use `/app/...` and are scoped by the active
organization. Public tracking links use short recipient-focused paths such as
`/r/:code`. Tracking link lookup resolves organization from the stored link
record, not from the URL.

Public recipient links use `https://go.retaino.com/r/:code`. API webhooks use
`https://api.retaino.com/v1/webhooks/twilio/messaging/inbound` and
`https://api.retaino.com/v1/webhooks/twilio/messaging/status`.
