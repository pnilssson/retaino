# Campaign MVP Branch Review Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:requesting-code-review for independent review checkpoints and
> superpowers:verification-before-completion before claiming the branch is ready
> to merge. This is a review plan, not an implementation plan. Findings should
> be fixed in small commits after each review pass.

**Goal:** Deeply review the completed campaign MVP implementation before PR or
merge, including Phase 1 even though it was committed before this branch.

**Architecture:** Review from requirements outward: product and compliance docs,
phase docs, database model, shared contracts, API behavior, background jobs, and
web UI. Use official provider and framework docs during review for SMS,
webhooks, idempotency, migrations, and billing-adjacent behavior.

**Tech Stack:** Next.js, Hono on Cloudflare Workers, Clerk, Neon Postgres,
Drizzle, Stripe, Inngest, Twilio, TanStack Query/Form.

---

## Branch Baseline

- Current branch: `codex/campaign-mvp`
- Branch review base: `addd5f0bd97cd7c7d95b1b85ecefce380c89010a`
- Current head at review-plan creation: `d4ec0b0 feat: add campaign tracking reports`
- Working tree at review-plan creation: clean

Phase commit map:

| Phase | Commit scope |
| --- | --- |
| 1. Campaign Persistence | `33ba067 feat: add campaign draft foundation` on main history before this branch |
| 2. Audience Preview | `0c6a3f7 feat: add campaign audience preview` |
| 3. Web Campaign Builder | `bedd74b feat: add campaign builder flow`, `0c02476 feat: persist campaign drafts earlier` |
| 4. SMS Provider And Test Sends | `ff677cf feat: add sms sender provisioning foundation`, `3e21668 feat: add campaign SMS test sends` |
| 5. Launch Snapshot | `2c010a9 feat: add campaign launch snapshots` |
| 6. Tracking Links And Live Send Jobs | `ecefb2e feat: send campaigns through background jobs` |
| 7. Events, Tracking, Reporting | `d4ec0b0 feat: add campaign tracking reports` |

## Review Inputs

Project docs:

- `AGENTS.md`
- `docs/architecture.md`
- `docs/product.md`
- `docs/compliance.md`
- `docs/tracking.md`
- `docs/superpowers/plans/2026-05-14-campaign-mvp-implementation.md`
- `docs/superpowers/plans/campaign-mvp/01-draft-foundation.md`
- `docs/superpowers/plans/campaign-mvp/02-audience-preview.md`
- `docs/superpowers/plans/campaign-mvp/03-web-campaign-builder.md`
- `docs/superpowers/plans/campaign-mvp/04-sms-provider-test-sends.md`
- `docs/superpowers/plans/campaign-mvp/05-launch-snapshot.md`
- `docs/superpowers/plans/campaign-mvp/06-live-send-jobs.md`
- `docs/superpowers/plans/campaign-mvp/07-events-tracking-reporting.md`

Official/current external references to check during review:

- Twilio webhook security:
  `https://www.twilio.com/docs/usage/webhooks/webhooks-security`
- Twilio messaging webhook request shape:
  `https://www.twilio.com/docs/messaging/guides/webhook-request`
- Twilio Messaging Services:
  `https://www.twilio.com/docs/messaging/services`
- Inngest idempotency:
  `https://www.inngest.com/docs/guides/handling-idempotency`
- Stripe webhooks and duplicate-event guidance:
  `https://docs.stripe.com/webhooks`
- Drizzle migrations:
  `https://orm.drizzle.team/docs/migrations`
- Hono on Cloudflare Workers:
  `https://hono.dev/docs/getting-started/cloudflare-workers`

## Pass 1: Requirements Matrix

- [ ] Build a checklist from every non-negotiable in
  `2026-05-14-campaign-mvp-implementation.md`.
- [ ] Build a checklist from every phase document, Phase 1 through Phase 7.
- [ ] Mark each item as implemented, intentionally deferred, unclear, or
  missing.
- [ ] Convert every missing or unclear production requirement into a concrete
  finding with file references.

Review focus:

- Campaign creation flow does not expose draft as the user goal.
- Tenant-owned campaign data always has `organizationId`.
- Every campaign query is scoped by `organizationId`.
- SMS mode is centralized in the provider factory.
- Campaign sends and reconciliation run in Inngest, not HTTP requests.
- Suppression checks run during preview, launch snapshot, and before send.
- Tracking URLs use public `/r/:code` links.
- Reporting does not imply bookings or revenue attribution.

## Pass 2: Data Model And Migrations

- [ ] Review all campaign-related Drizzle schema and migrations from Phase 1
  through Phase 7.
- [ ] Confirm migrations were generated from schema and are ordered cleanly.
- [ ] Confirm indexes match query access patterns.
- [ ] Confirm deletion behavior preserves required snapshots without blocking
  normal contact management.
- [ ] Confirm stored hashes, phone values, emails, raw payloads, and click data
  are necessary and not exposed unnecessarily.

Files to inspect first:

- `packages/db/src/schema/campaigns.ts`
- `packages/db/src/schema/sms-messages.ts`
- `packages/db/src/schema/campaign-message-events.ts`
- `packages/db/src/schema/click-events.ts`
- `packages/db/src/schema/tracking-links.ts`
- `packages/db/migrations`

## Pass 3: Shared Contracts

- [ ] Review public request and response contracts for PII leakage.
- [ ] Confirm user-facing API responses do not expose internal matching hashes
  unless there is a clear product need.
- [ ] Confirm validation rules match product language for campaign code,
  booking URL, SMS body, and personalization tokens.
- [ ] Confirm report response names are stable and clear enough for UI and
  future API users.

Files to inspect first:

- `packages/shared/src/contracts/campaigns.ts`
- `packages/shared/src/contracts/contacts.ts`
- `packages/shared/test/contracts/campaigns.test.ts`

## Pass 4: Campaign Lifecycle And Send Safety

- [ ] Review all campaign status transitions from draft through sent or failed.
- [ ] Confirm final send freezes recipients exactly once and is safe under
  double-clicks and retries.
- [ ] Confirm background send retries cannot duplicate provider sends.
- [ ] Confirm campaign rows cannot become locked without a queued send unless
  the state is intentionally recoverable.
- [ ] Confirm one active live send per organization is enforced by the database
  path, not just UI.
- [ ] Confirm credit reservation and release behavior is idempotent and auditable.

Files to inspect first:

- `packages/db/src/queries/campaigns.ts`
- `apps/api/src/features/campaigns/campaigns.routes.ts`
- `apps/api/src/features/campaigns/campaigns.jobs.ts`
- `apps/api/src/features/campaigns/campaigns.service.ts`
- `apps/api/src/features/billing/billing.service.ts`

## Pass 5: SMS Provider, Twilio, And Webhooks

- [ ] Compare Twilio signature validation against Twilio's current official
  webhook security docs.
- [ ] Confirm validation uses the exact public URL Twilio sees, including proxy
  and host behavior in Cloudflare.
- [ ] Confirm form parameters are not hard-coded for signature validation.
- [ ] Confirm JSON webhook handling follows Twilio's `bodySHA256` behavior if
  JSON callbacks are accepted.
- [ ] Confirm inbound STOP detection includes provider `OptOutType` and
  body-based fallback.
- [ ] Confirm non-STOP inbound replies are stored even when campaign matching is
  uncertain.
- [ ] Confirm route handlers return quickly enough for provider callback
  retries.

Files to inspect first:

- `apps/api/src/lib/twilio-provider.ts`
- `apps/api/src/lib/sms-provider.ts`
- `apps/api/src/features/sms/sms.webhook-routes.ts`
- `apps/api/test/lib/sms-provider.test.ts`
- `apps/api/test/features/sms/sms.webhook-routes.test.ts`

## Pass 6: Public Tracking And Privacy

- [ ] Confirm `/r/:code` does not require Clerk auth.
- [ ] Confirm unknown codes do not leak tenant or campaign information.
- [ ] Confirm rate limiting is production-suitable for Cloudflare Workers.
- [ ] Confirm click recording uses the stored tracking link, not URL-derived
  tenant data.
- [ ] Confirm IP and user-agent collection is consistent with `docs/tracking.md`
  and `docs/compliance.md`.
- [ ] Confirm redirect target URLs are restricted to validated campaign booking
  URLs.

Files to inspect first:

- `apps/api/src/features/tracking/tracking.routes.ts`
- `packages/db/src/queries/campaigns.ts`
- `docs/tracking.md`
- `docs/compliance.md`

## Pass 7: Web UX And UI

- [ ] Run the web app and complete the campaign flow end to end in test mode.
- [ ] Review desktop and mobile screenshots for campaign list, builder, sender
  setup, test SMS, send confirmation, sending state, sent state, failed state,
  and report view.
- [ ] Confirm copy hides internal implementation terms unless needed.
- [ ] Confirm no cards inside cards and no nested framed surfaces.
- [ ] Confirm buttons, icons, disabled states, loading states, and errors are
  clear.
- [ ] Confirm the report UI labels activity honestly and avoids booking or
  revenue attribution claims.

Files to inspect first:

- `apps/web/src/features/campaigns/components/campaign-builder-screen.tsx`
- `apps/web/src/features/campaigns/components/campaign-form.tsx`
- `apps/web/src/features/campaigns/components/campaign-report-panel.tsx`
- `apps/web/src/features/campaigns/components/sender-setup.tsx`
- `apps/web/src/features/campaigns/components/campaigns-table.tsx`

## Pass 8: Tests And Verification

- [ ] Review whether tests assert behavior or mostly implementation shape.
- [ ] Add missing tests for true production risks found in earlier passes.
- [ ] Run focused package verification after each fix.
- [ ] Run full repo verification before PR.

Final commands:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Pass 9: Review Output

Produce a review summary with:

- Critical findings that must be fixed before PR.
- Important findings that should be fixed before PR.
- Minor findings or UI polish candidates.
- Deferred work that belongs outside the campaign MVP.
- Final verification commands and results.

Do not open a PR until critical and important findings are fixed or explicitly
reclassified with evidence.
