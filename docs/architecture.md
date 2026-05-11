# Architecture

Retaino is a multi-tenant SaaS for SMS-based customer reactivation. This file is
the main engineering reference for repo structure, tenant boundaries, and runtime
rules.

## Related Docs

- `docs/product.md`: product scope, target users, and build order.
- `docs/compliance.md`: compliance, data minimization, retention, and audit
  rules.
- `docs/caching.md`: cache layers, tenant-scoped keys, and invalidation rules.
- `docs/tracking.md`: short links, booking reconciliation, attribution, and
  reporting.

## Monorepo Layout

- `apps/web`: Next.js App Router frontend on Vercel.
- `apps/api`: Hono API on Cloudflare Workers.
- `packages/db`: Drizzle schema, migrations, and query layer for Neon Postgres.
- `packages/shared`: cross-app contracts, schemas, constants, and helpers.
- `packages/eslint-config`: shared ESLint flat config.
- `packages/typescript-config`: shared TypeScript config.

## Tenant Model

Organizations are the tenant boundary. Users can belong to multiple
organizations, but product data always belongs to an organization, not a user.
User ID is actor identity only.

Clerk Organizations are the source of truth for:

- authentication
- organization creation
- membership and invitations
- active organization selection
- base roles

Retaino mirrors users and organizations locally so product tables can use stable
internal foreign keys. Do not add a local membership mirror in MVP. Add one later
only if audit, support, or product queries require historical membership
snapshots. A future local mirror must never grant access by itself.

## Access Rules

Every authenticated API request must:

1. Verify the user.
2. Resolve the active organization.
3. Verify membership in that organization.
4. Resolve the internal `organizationId`.
5. Pass `organizationId` into service and query functions.

Request body organization IDs are untrusted. Ignore them or validate them
against the authenticated active organization.

Use shared permission helpers for role checks. Do not scatter raw role string
checks through product code.

MVP roles:

| Role | Meaning |
| --- | --- |
| `org:admin` | Can manage organization setup, team access, billing, imports, campaigns, and reports. |
| `org:member` | Can work inside the organization, with destructive and billing actions restricted. |

## Data Rules

Every tenant-owned table must include `organizationId`. This includes contacts,
suppressions, imports, campaigns, recipients, messages, tracking links, click
events, booking imports, bookings, attribution matches, billing records, and
audit logs.

Every tenant-scoped query must require `organizationId` at the boundary. Shared
query functions in `packages/db` should require organization context instead of
accepting it as an optional filter.

Never process a tenant-owned resource by ID alone.

## Background Jobs

Long-running work must run in background jobs, not inside HTTP requests.

Job payloads must include:

- `organizationId`
- initiating `userId` when there is a user actor
- source resource ID, such as import ID, campaign ID, or booking import ID

Jobs must re-read data by `organizationId` and resource ID together.

Tenant-sensitive jobs include CSV parsing, dedupe, suppression filtering,
campaign sending, provider event handling, booking reconciliation, report
aggregation, and retention cleanup.

CSV source files and other job inputs that cannot fit safely in a job payload
must be stored in private object storage under an organization-scoped key. The
job payload should carry only the organization, actor, and source resource
identifiers needed to re-read the stored input.

## SMS Provider

Twilio is the MVP SMS provider.

Use Twilio for campaign sends, test sends, delivery status callbacks, inbound
reply callbacks, and STOP-style opt-out handling. Start with a numeric sender
or Messaging Service configuration that supports inbound replies, because
Retaino must be able to capture STOP replies and add organization-level
suppressions.

Keep SMS code behind a provider adapter in `apps/api/src/lib/` or a focused
campaign messaging module. Product features must depend on Retaino message
contracts, not Twilio SDK types or webhook payloads directly. This keeps
campaign sending, suppression handling, cost reporting, and provider event
storage portable if a second provider is added later.

The adapter should normalize:

- outbound message IDs
- queued, sent, delivered, undelivered, failed, and reply events
- provider error codes and failure reasons
- inbound STOP-style replies
- SMS segment counts and estimated provider cost

Twilio credentials, webhook signing secrets, Messaging Service IDs, sender
numbers, and region settings belong in environment configuration. Do not store
provider secrets in tenant-owned product tables.

## API Structure

- `src/server.ts` composes routes and global error handling.
- Operational endpoints, such as `/health`, stay separate from authenticated
  product routes.
- Product code belongs in `src/features/<feature>/`.
- Use `<feature>.routes.ts` for thin HTTP handlers.
- Use `<feature>.service.ts` for business logic when routes get non-trivial.
- Provider adapters and shared errors belong in `src/lib/`.
- Request concerns, auth, guards, and context belong in `src/middleware/`.
- Database access must come from `packages/db`, not inline route SQL.

## Web Structure

Use App Router route groups by intent:

- `src/app/(marketing)/...`
- `src/app/(auth)/...`
- `src/app/(app)/...`

Feature modules live under `src/features/<feature>/`. Shared frontend utilities
live under `src/lib/`.

Reusable generated shadcn primitives live under `src/components/ui/`. Do not
manually edit generated shadcn files. Compose them from feature code.

Application forms use TanStack Form. Do not hand-roll form state, validation,
touched state, or submit handling with local React state unless explicitly
approved for a one-off exception.

## Shared Contracts

Centralize cross-app zod schemas, route contracts, constants, and shared helper
types in `packages/shared`.

Prefer imports from `@retaino/shared` over redefining types in apps. If logic is
used by both web and API, it belongs in `packages/shared`.

## URLs

Authenticated app routes use `/app/...` and are scoped by the active
organization.
Public tracking links should stay short and recipient-focused, for example
`/r/:code`.

Tracking link lookup must resolve the organization from the stored link record,
not from the URL.
