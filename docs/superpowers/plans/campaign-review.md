# Campaign MVP Branch Review Log

> Completed first deep review of the campaign MVP branch. Use this as the
> review log for what was inspected. The condensed finding audit trail lives in
> `docs/superpowers/plans/campaign-audit.md`.

**Goal:** Deeply review the completed campaign MVP implementation before PR or
merge, including Phase 1 even though it was committed before this branch.

**Review Method:** Review from requirements outward: product and compliance docs,
canonical campaign plan, database model, shared contracts, API behavior,
background jobs, tests, and web UI. Use official provider and framework docs
during review for SMS, webhooks, idempotency, rate limiting, migrations, and
billing-adjacent behavior.

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
- `docs/superpowers/plans/campaign-mvp.md`

The original Phase 1 through Phase 7 implementation notes were reviewed during
the first pass and then consolidated into the canonical implementation plan.

Official/current external references to check during review:

- Twilio webhook security:
  `https://www.twilio.com/docs/usage/webhooks/webhooks-security`
- Twilio messaging webhook request shape:
  `https://www.twilio.com/docs/messaging/guides/webhook-request`
- Twilio Messaging Services:
  `https://www.twilio.com/docs/messaging/services`
- Twilio STOP keyword support:
  `https://help.twilio.com/hc/en-us/articles/223134027-Twilio-support-for-STOP-BLOCK-and-CANCEL-SMS-STOP-filtering-`
- Twilio Advanced Opt-Out:
  `https://www.twilio.com/docs/messaging/services/tutorials/advanced-opt-out`
- Inngest idempotency:
  `https://www.inngest.com/docs/guides/handling-idempotency`
- Cloudflare Worker rate-limit bindings:
  `https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/`
- Stripe webhooks and duplicate-event guidance:
  `https://docs.stripe.com/webhooks`
- Drizzle migrations:
  `https://orm.drizzle.team/docs/migrations`
- Hono on Cloudflare Workers:
  `https://hono.dev/docs/getting-started/cloudflare-workers`

## Pass 1: Requirements Matrix

- [x] Build a checklist from every non-negotiable in
  `campaign-mvp.md`.
- [x] Build a checklist from the Phase 1 through Phase 7 implementation
  requirements that existed during the first review pass.
- [x] Mark each item as implemented, intentionally deferred, unclear, or
  missing.
- [x] Convert every missing or unclear production requirement into a concrete
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

- [x] Review all campaign-related Drizzle schema and migrations from Phase 1
  through Phase 7.
- [x] Confirm migrations were generated from schema and are ordered cleanly.
- [x] Confirm indexes match query access patterns.
- [x] Confirm deletion behavior preserves required snapshots without blocking
  normal contact management.
- [x] Confirm stored hashes, phone values, emails, raw payloads, and click data
  are necessary and not exposed unnecessarily.

Files to inspect first:

- `packages/db/src/schema/campaigns.ts`
- `packages/db/src/schema/sms-messages.ts`
- `packages/db/src/schema/campaign-message-events.ts`
- `packages/db/src/schema/click-events.ts`
- `packages/db/src/schema/tracking-links.ts`
- `packages/db/migrations`

## Pass 3: Shared Contracts

- [x] Review public request and response contracts for PII leakage.
- [x] Confirm user-facing API responses do not expose internal matching hashes
  unless there is a clear product need.
- [x] Confirm validation rules match product language for campaign code,
  booking URL, SMS body, and personalization tokens.
- [x] Confirm report response names are stable and clear enough for UI and
  future API users.

Files to inspect first:

- `packages/shared/src/contracts/campaigns.ts`
- `packages/shared/src/contracts/contacts.ts`
- `packages/shared/test/contracts/campaigns.test.ts`

## Pass 4: Campaign Lifecycle And Send Safety

- [x] Review all campaign status transitions from draft through sent or failed.
- [x] Confirm final send freezes recipients exactly once and is safe under
  double-clicks and retries.
- [x] Confirm background send retries cannot duplicate provider sends.
- [x] Confirm campaign rows cannot become locked without a queued send unless
  the state is intentionally recoverable.
- [x] Confirm one active live send per organization is enforced by the database
  path, not just UI.
- [x] Confirm credit reservation and release behavior is idempotent and auditable.

Files to inspect first:

- `packages/db/src/queries/campaigns.ts`
- `apps/api/src/features/campaigns/campaigns.routes.ts`
- `apps/api/src/features/campaigns/campaigns.jobs.ts`
- `apps/api/src/features/campaigns/campaigns.service.ts`
- `apps/api/src/features/billing/billing.service.ts`

## Pass 5: SMS Provider, Twilio, And Webhooks

- [x] Compare Twilio signature validation against Twilio's current official
  webhook security docs.
- [x] Confirm validation uses the exact public URL Twilio sees, including proxy
  and host behavior in Cloudflare.
- [x] Confirm form parameters are not hard-coded for signature validation.
- [x] Confirm JSON webhook handling follows Twilio's `bodySHA256` behavior if
  JSON callbacks are accepted.
- [x] Confirm inbound STOP detection includes provider `OptOutType` and
  body-based fallback.
- [x] Confirm non-STOP inbound replies are stored even when campaign matching is
  uncertain.
- [x] Confirm route handlers return quickly enough for provider callback
  retries.

Files to inspect first:

- `apps/api/src/lib/twilio-provider.ts`
- `apps/api/src/lib/sms-provider.ts`
- `apps/api/src/features/sms/sms.webhook-routes.ts`
- `apps/api/test/lib/sms-provider.test.ts`
- `apps/api/test/features/sms/sms.webhook-routes.test.ts`

## Pass 6: Public Tracking And Privacy

- [x] Confirm `/r/:code` does not require Clerk auth.
- [x] Confirm unknown codes do not leak tenant or campaign information.
- [x] Confirm rate limiting is production-suitable for Cloudflare Workers.
- [x] Confirm click recording uses the stored tracking link, not URL-derived
  tenant data.
- [x] Confirm IP and user-agent collection is consistent with `docs/tracking.md`
  and `docs/compliance.md`.
- [x] Confirm redirect target URLs are restricted to validated campaign booking
  URLs.

Files to inspect first:

- `apps/api/src/features/tracking/tracking.routes.ts`
- `packages/db/src/queries/campaigns.ts`
- `docs/tracking.md`
- `docs/compliance.md`

## Pass 7: Web UX And UI

- [x] Perform static UI and UX review without browser walkthroughs or
  agent-created screenshots.
- [x] Confirm copy hides internal implementation terms unless needed.
- [x] Confirm no cards inside cards and no nested framed surfaces.
- [x] Confirm buttons, icons, disabled states, loading states, and errors are
  clear.
- [x] Confirm the report UI labels activity honestly and avoids booking or
  revenue attribution claims.

Files to inspect first:

- `apps/web/src/features/campaigns/components/campaign-builder-screen.tsx`
- `apps/web/src/features/campaigns/components/campaign-form.tsx`
- `apps/web/src/features/campaigns/components/campaign-report-panel.tsx`
- `apps/web/src/features/campaigns/components/sender-setup.tsx`
- `apps/web/src/features/campaigns/components/campaigns-table.tsx`

## Pass 8: Tests And Verification

- [x] Review whether tests assert behavior or mostly implementation shape.
- [x] Add missing tests for true production risks found in earlier passes.
- [x] Run focused package verification after each fix.
- [x] Run full repo verification before PR.

Final commands:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Pass 9: Review Output

Completed review summary is captured in the audit trail:

- Critical findings that must be fixed before PR.
- Important findings that should be fixed before PR.
- Minor findings or UI polish candidates.
- Deferred work that belongs outside the campaign MVP.
- Final verification commands and results.

Critical and important findings from this first review pass have been fixed.
Manual UI review remains owner-led by request. Agent-created browser
walkthroughs and screenshots were intentionally not performed.

## Pass 10: External Reference And Deletion Review

Purpose: validate the current implementation against primary provider and
platform docs, then remove implementation that is speculative, stale, duplicated,
or not valuable for the campaign MVP.

- [ ] Refresh the official references listed above and note any changed
  requirements that affect campaign sending, Twilio callbacks, STOP handling,
  Cloudflare redirect rate limiting, Inngest retries, Stripe-backed credit
  idempotency, or Drizzle migrations.
- [ ] Compare Twilio webhook validation code with the current webhook security
  docs, including form parameter sorting, exact callback URL handling, and JSON
  `bodySHA256` behavior.
- [ ] Compare Twilio inbound reply handling with current STOP, START, HELP,
  REVOKE, and OPTOUT behavior. Confirm Retaino suppresses only true STOP-style
  opt-outs and preserves non-STOP replies.
- [ ] Compare tracking redirect protection with Cloudflare Worker rate-limit
  binding behavior, including the per-location nature of rate limits.
- [ ] Compare campaign send retry behavior with Inngest retry and idempotency
  guidance. Treat database state as the durable source of truth, not event
  dedupe alone.
- [ ] Compare credit reservation and release behavior with Stripe duplicate
  event guidance and Retaino's local SMS credit ledger model.
- [ ] Confirm Drizzle schema and generated migrations still match. Do not edit
  generated migration SQL or metadata by hand.
- [ ] Run a deletion review over new modules, helpers, routes, types, and UI
  pieces. Remove code when it is only speculative future scaffolding, a
  pass-through wrapper, duplicated logic, or a preserved remnant of a removed
  concept.
- [ ] For every finding, either fix it immediately or record it in
  `docs/superpowers/plans/campaign-audit.md` with a concrete file reference and
  proposed fix.

Primary files:

- `apps/api/src/features/campaigns/campaigns.routes.ts`
- `apps/api/src/features/campaigns/campaigns.service.ts`
- `apps/api/src/features/campaigns/campaigns.jobs.ts`
- `apps/api/src/features/sms/sms.webhook-routes.ts`
- `apps/api/src/features/tracking/tracking.routes.ts`
- `apps/api/src/lib/twilio-provider.ts`
- `apps/api/src/lib/sms-provider.ts`
- `packages/db/src/queries/campaigns.ts`
- `packages/db/src/schema`
- `packages/shared/src/contracts/campaigns.ts`
- `apps/web/src/features/campaigns`

## Pass 11: Test Relevance Audit

Purpose: keep tests focused on current product behavior and production risks.
Negative tests are useful when they protect current behavior. Tests for concepts
that Retaino removed are noise and should be deleted with the removed concept.

- [ ] Inventory campaign-related tests by package:
  `packages/shared/test`, `packages/db/test`, and `apps/api/test`.
- [ ] For each test, classify it as one of:
  `current behavior`, `production guardrail`, `regression for fixed finding`,
  `implementation-shape only`, `stale removed concept`, or `duplicate coverage`.
- [ ] Keep negative tests that protect active contracts, tenant scoping, auth,
  send safety, idempotency, privacy, suppression behavior, provider validation,
  billing ledger behavior, or URL validation.
- [ ] Delete tests for removed concepts such as a public launch endpoint,
  persisted click IP data, exposed provider references, recipient hashes in API
  responses, or any other behavior that no longer exists in the product.
- [ ] Delete or rewrite tests that only assert private implementation shape when
  the same risk is better tested through a public package interface.
- [ ] Remove duplicate tests when one clear package-level test already protects
  the behavior and additional copies only make future refactors harder.
- [ ] After each cleanup batch, run the smallest relevant package command, then
  run full verification before committing.

Test files to inspect first:

- `packages/shared/test/contracts/campaigns.test.ts`
- `packages/db/test/queries/campaigns.test.ts`
- `packages/db/test/schema/campaigns.test.ts`
- `packages/db/test/schema/click-events.test.ts`
- `packages/db/test/schema/sms-senders.test.ts`
- `apps/api/test/features/campaigns/campaigns.routes.test.ts`
- `apps/api/test/features/campaigns/campaigns.service.test.ts`
- `apps/api/test/features/sms/sms.routes.test.ts`
- `apps/api/test/features/sms/sms.webhook-routes.test.ts`
- `apps/api/test/features/tracking/tracking.routes.test.ts`
- `apps/api/test/lib/sms-provider.test.ts`

Verification for this pass:

```bash
pnpm --filter @retaino/shared test
pnpm --filter @retaino/db test
pnpm --filter @retaino/api test
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```
