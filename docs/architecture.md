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
| `org:admin` | Manages setup, team access, billing, imports, campaigns, and reports. |
| `org:member` | Works inside the organization without billing or destructive actions. |

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

The adapter normalizes outbound IDs, provider states, error details, inbound
STOP-style replies, segment counts, and estimated provider cost. Provider
credentials and sender configuration stay in environment bindings, never
tenant-owned tables.

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
- Credit transactions are append-only.
- Sends must check enough credits before provider cost is incurred, then debit
  actual usage after send completion.
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
