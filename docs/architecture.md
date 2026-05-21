# Architecture

Retaino is a multi-tenant SaaS for SMS-based customer reactivation.

## Related Docs

- `docs/product.md`: product scope and build order.
- `docs/compliance.md`: legal, privacy, retention, and audit rules.
- `docs/caching.md`: cache policy and query-key rules.
- `docs/pricing.md`: plans, credit rules, and Stripe decisions.
- `docs/tracking.md`: short links, booking reconciliation, and attribution.

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

The adapter models Retaino's SMS domain, not Twilio's API shape. It normalizes
sender provisioning, sender capabilities, outbound IDs, provider states, error
details, inbound replies, STOP-style replies, segment counts, estimated and
actual provider cost, webhook signature verification, and provider references.
Provider credentials stay in environment bindings, never tenant-owned tables.

SMS providers differ in how they represent sender groups, phone number
capabilities, webhooks, delivery reports, delivery states, smart encoding,
regulatory requirements, and error payloads. Retaino product code must call a
provider-neutral interface and must not know whether the underlying provider
uses a Twilio Messaging Service, Telnyx Messaging Profile, Vonage application,
Sinch service plan, Bird channel, or another provider-specific object.

Each organization gets its own SMS-capable Twilio number and its own Twilio
Messaging Service before real sends. Do not use one shared Retaino sender
number across tenants. Do not use alphanumeric sender IDs for MVP.

Organization sender configuration is tenant-owned operational data. Store the
provider, Messaging Service SID, phone number SID, E.164 phone number,
selected country, provisioning status, failure reason, and timestamps in
Retaino. Do not store Twilio account credentials in tenant-owned tables.

Provision sender resources lazily after the organization has an active paid
subscription and current legal acceptance, when a user first prepares a
campaign for test or live sending. Do not buy a Twilio number immediately after
checkout and do not require a sender for draft creation or audience preview.
Provisioning runs idempotently and must not create a second sender for the same
organization on retries.

Onboarding should collect organization identity and address fields that are
likely to be required for phone-number compliance so sender setup does not ask
for the same company details again. If a selected sender country or two-way SMS
number requires additional regulatory data, the user supplies it through
Retaino. Retaino staff must not need to manually configure each customer.
Sender categories that cannot be self-served through Retaino are not available
in MVP.

Sender setup is organization-controlled. Users choose the target sender country
based on where their recipients are, then select an available two-way SMS number
or accept a recommended two-way SMS number. The provider layer may support
multiple number types, but the MVP product exposes only two-way SMS sender
setup. Retaino searches provider inventory using the provider number type needed
for two-way SMS support and stores the verified provider result. Users do not
choose provider number type. The organization's legal address is only a default,
not the source of truth for sender country.

Configure organization Messaging Services with service-level inbound and status
callback URLs. The inbound callback stores every inbound message. STOP-style
replies create suppressions immediately; other replies are retained so a later
Retaino inbox can be added without rebuilding campaign messaging.

Live campaign senders must support the opt-out path Retaino presents to
recipients. Do not use one-way alphanumeric sender IDs for live campaigns while
reply-based STOP handling is the only opt-out mechanism.

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
