# Stripe Billing Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the complete MVP Stripe billing flow for Retaino subscriptions, credit packs, billing status, customer portal access, and SMS credit enforcement.

**Architecture:** Stripe is the source of truth for payments, subscriptions, Checkout sessions, Customer Portal sessions, and payment webhooks. Retaino is the source of truth for operational SMS credits through append-only credit transactions because SMS sends must be blocked before Twilio cost is incurred. Stripe Billing Credits are not used for MVP enforcement because they are public preview and apply to subscription invoices at finalization.

**Tech Stack:** Stripe Checkout, Stripe Billing, Stripe Customer Portal, Stripe Tax, Stripe CLI, `stripe` Node SDK, Hono on Cloudflare Workers, Next.js on Vercel, Clerk organizations, Neon Postgres with Drizzle, Vitest.

---

## Research Summary

Stripe supports the pieces needed for this MVP:

- Checkout Sessions support subscription and one-time payment flows.
- Stripe Billing supports recurring subscriptions and Customer Portal.
- Stripe Tax can calculate and itemize tax in Checkout.
- Stripe webhooks are the correct source for granting credits after successful
  payment.
- Stripe meter events can record usage, but Retaino does not need Stripe metered
  overage billing for MVP.
- Stripe Billing Credits can represent prepaid credits, but they apply to
  metered subscription invoice lines at invoice finalization. They are not the
  right enforcement mechanism for blocking SMS before send.
- Stripe Billing Credits are public preview, so relying on them for Retaino's
  core SMS send authorization would add unnecessary risk.
- Stripe meters become mostly immutable after configuration, so avoid using a
  Stripe meter unless we actually need Stripe-native usage invoices.

Sources:

- https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits
- https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage-api
- https://docs.stripe.com/billing/subscriptions/usage-based/meters/configure
- https://docs.stripe.com/customer-management/integrate-customer-portal
- https://docs.stripe.com/payments/checkout
- https://docs.stripe.com/webhooks
- https://stripe.com/en-se/pricing
- https://stripe.com/legal/restricted-businesses

## Product Decisions

- One Stripe customer maps to one Retaino organization.
- Store Retaino `organizationId` on Stripe customer metadata.
- Store `organizationId`, checkout purpose, plan key, and credit pack key in
  Checkout Session metadata.
- Use Checkout Session `branding_settings.display_name = Retaino` for Retaino
  checkout sessions so the account-level public name can still support the
  owner's consulting work. Stripe can still show the account business name in
  receipts, terms, and other places.
- Use SEK prices from `docs/pricing.md`.
- Show prices ex VAT.
- Configure Stripe prices and Checkout to support tax calculation through Stripe
  Tax.
- Use one Retaino credit for one SMS segment.
- Do not create Stripe metered overage billing in MVP.
- Do not use Stripe Billing Credits for MVP send authorization.
- Use Retaino append-only SMS credit transactions.
- Subscription renewal webhooks grant included monthly credits.
- Credit pack payment webhooks grant purchased credits.
- Included monthly credits do not roll over.
- Purchased credit pack credits roll over and do not expire in MVP.
- Active subscription is required to use any SMS credits.
- Test sends consume credits.
- Campaign live send checks Retaino credit balance once for the full estimated
  campaign cost before sending starts.
- Retaino allows only one active live send per organization at a time.

## Stripe Catalog

Create these resources in Stripe test mode first, then production.

### Products And Prices

| Key | Product name | Mode | Price | Billing | Metadata |
| --- | --- | --- | ---: | --- | --- |
| `starter` | Retaino Starter | subscription | 699 SEK | monthly | `retaino_plan_key=starter`, `included_sms_credits=300` |
| `growth` | Retaino Growth | subscription | 1,499 SEK | monthly | `retaino_plan_key=growth`, `included_sms_credits=1000` |
| `scale` | Retaino Scale | subscription | 2,999 SEK | monthly | `retaino_plan_key=scale`, `included_sms_credits=3000` |
| `credits_500` | Retaino 500 SMS credits | payment | 595 SEK | one-time | `retaino_credit_pack_key=credits_500`, `sms_credits=500` |
| `credits_1500` | Retaino 1,500 SMS credits | payment | 1,650 SEK | one-time | `retaino_credit_pack_key=credits_1500`, `sms_credits=1500` |
| `credits_5000` | Retaino 5,000 SMS credits | payment | 5,000 SEK | one-time | `retaino_credit_pack_key=credits_5000`, `sms_credits=5000` |

## Manual Stripe Setup Needed From User

- Confirm the existing Stripe account can process this use case.
- Make sure the public business description is accurate:

```text
Retaino is a B2B SaaS platform for permission-based SMS customer reactivation. Organizations use the software to message their own existing customers, with consent, unsubscribe handling, suppression lists, delivery tracking, and compliance controls. It is not a lead generation service, list resale service, cold outreach service, or third-party advertising marketplace.
```

- Create Stripe products and prices listed in `Stripe Catalog`, or authorize the
  agent to create them through available Stripe tools if configured.
- Enable Stripe Customer Portal.
- Configure Customer Portal to allow payment method updates, invoice history,
  cancellation, and plan switching between the three subscription prices.
- Enable Stripe Tax if we want Stripe to calculate VAT at checkout.
- Add webhook endpoint:
  - local: through Stripe CLI
  - production: deployed API `/v1/billing/webhooks`
- For local webhook testing, run:

```powershell
stripe listen --forward-to http://127.0.0.1:8787/v1/billing/webhooks
```

- Copy the CLI-provided webhook signing secret into API env as
  `STRIPE_WEBHOOK_SECRET`.

## Runtime Environment

Add API bindings:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `STRIPE_CHECKOUT_DISPLAY_NAME`, default `Retaino`
- `STRIPE_RETURN_URL`
- `STRIPE_PRICE_STARTER_ID`
- `STRIPE_PRICE_GROWTH_ID`
- `STRIPE_PRICE_SCALE_ID`
- `STRIPE_PRICE_CREDITS_500_ID`
- `STRIPE_PRICE_CREDITS_1500_ID`
- `STRIPE_PRICE_CREDITS_5000_ID`

Add web environment:

- `NEXT_PUBLIC_BILLING_SUCCESS_PATH=/app/settings/billing/success`
- `NEXT_PUBLIC_BILLING_RETURN_PATH=/app/settings/billing`

Do not expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the web app.

## File Ownership

### Shared Contracts

- Modify `packages/shared/src/contracts/index.ts`
- Create `packages/shared/src/contracts/billing.ts`
- Create tests under `packages/shared/test/contracts/billing.test.ts`

Responsibilities:

- Define plan keys, credit pack keys, billing status values, credit transaction
  types, and route response schemas.

### Database

- Modify `packages/db/src/schema/index.ts`
- Create `packages/db/src/schema/billing.ts`
- Modify `packages/db/src/queries/index.ts`
- Create `packages/db/src/queries/billing.ts`
- Create tests under `packages/db/test/schema/billing.test.ts`
- Create tests under `packages/db/test/queries/billing.test.ts`

Responsibilities:

- Store Stripe customer and subscription projection.
- Store webhook event records idempotently.
- Store append-only SMS credit transactions.
- Store cached current credit balance only if it is updated in the same
  transaction as credit transaction inserts. If that increases complexity,
  compute balance from credit transactions first and optimize later.

Core tables:

- `organization_billing_profiles`
  - `organizationId`
  - `stripeCustomerId`
  - `stripeSubscriptionId`
  - `stripePriceId`
  - `planKey`
  - `subscriptionStatus`
  - `currentPeriodStart`
  - `currentPeriodEnd`
  - `cancelAtPeriodEnd`
  - `syncedAt`
- `billing_webhook_events`
  - `stripeEventId`
  - `eventType`
  - `organizationId`
  - `status`
  - `payload`
  - `receivedAt`
  - `processedAt`
- `sms_credit_transactions`
  - `organizationId`
  - `type`
  - `credits`
  - `source`
  - `sourceId`
  - `description`
  - `createdAt`

Credit transaction rules:

- Positive credits are grants.
- Negative credits are debits.
- `source` and `sourceId` must be unique together for idempotency.
- Subscription renewal grants use source `stripe_invoice`.
- Credit pack grants use source `stripe_checkout_session`.
- Campaign debits use source `campaign_send`.
- Test send debits use source `campaign_test_send`.
- Refund adjustments use source `stripe_refund` or `stripe_credit_note`.

### API

- Modify `apps/api/package.json`
- Modify `apps/api/src/types.ts`
- Modify `apps/api/src/server.ts`
- Create `apps/api/src/lib/stripe.ts`
- Create `apps/api/src/features/billing/billing.catalog.ts`
- Create `apps/api/src/features/billing/billing.routes.ts`
- Create `apps/api/src/features/billing/billing.service.ts`
- Create `apps/api/src/features/billing/billing.webhooks.ts`
- Create tests under `apps/api/test/features/billing`
- Create tests under `apps/api/test/lib/stripe.test.ts`

Responsibilities:

- Centralize Stripe SDK construction in `apps/api/src/lib/stripe.ts`.
- Keep all Stripe secret key usage server-side.
- Add authenticated billing routes under `/v1/billing`.
- Add unauthenticated webhook route at `/v1/billing/webhooks`, protected by
  Stripe signature validation.
- Use `organizationId` from auth context for checkout and billing status.
- Create or reuse a Stripe customer for the active organization before checkout.
- Create subscription Checkout Sessions for plan purchases.
- Create payment Checkout Sessions for credit packs.
- Create Customer Portal sessions for subscription management.
- Grant SMS credits only from trusted Stripe webhook events.
- Expose a service function for campaign sending:
  `assertOrganizationCanSpendSmsCredits(organizationId, estimatedSegments)`.
- Expose a service function for campaign completion:
  `debitSmsCreditUsage(organizationId, actualSegments, sourceId)`.

### Web

- Create `apps/web/src/features/billing/billing-query-keys.ts`
- Create `apps/web/src/features/billing/billing-api.ts`
- Create `apps/web/src/features/billing/components/billing-screen.tsx`
- Create `apps/web/src/features/billing/components/billing-plan-list.tsx`
- Create `apps/web/src/features/billing/components/credit-pack-list.tsx`
- Create `apps/web/src/features/billing/components/billing-status-panel.tsx`
- Create route files under `apps/web/src/app/(app)/app/settings/billing`

Responsibilities:

- Billing page shows current subscription status, active plan, available SMS
  credits, subscription tiers, credit packs, and customer portal link.
- Only org admins can start checkout or open customer portal.
- Do not start the dev server, run Playwright, or perform browser verification
  during agent implementation. The user verifies the web UI manually.

## API Route Shape

Authenticated routes:

- `GET /v1/billing/status`
  - returns active subscription state, current plan, credit balance, and portal
    availability.
- `POST /v1/billing/checkout/subscription`
  - body: `{ "planKey": "starter" | "growth" | "scale" }`
  - returns `{ "url": "https://..." }`
- `POST /v1/billing/checkout/credits`
  - body: `{ "packKey": "credits_500" | "credits_1500" | "credits_5000" }`
  - returns `{ "url": "https://..." }`
- `POST /v1/billing/portal`
  - returns `{ "url": "https://..." }`

Webhook route:

- `POST /v1/billing/webhooks`
  - validates Stripe signature.
  - records event idempotently.
  - updates billing projection.
  - grants or adjusts SMS credits.

Required webhook events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `charge.refunded`

## Implementation Phases

### Phase 1: Billing Contracts

- [ ] Add shared billing keys, schemas, and tests.
- [ ] Define plan keys and credit pack keys exactly once.
- [ ] Define credit transaction types exactly once.
- [ ] Define response schemas for billing status, checkout URL, and portal URL.
- [ ] Run `pnpm --filter @retaino/shared test`.
- [ ] Run `pnpm --filter @retaino/shared typecheck`.

### Phase 2: Database Billing And Credit Transactions

- [ ] Add Drizzle billing schema.
- [ ] Add billing query functions for projection, webhook events, credit grants,
  credit debits, and balance reads.
- [ ] Add package-level schema and query tests.
- [ ] Generate migration through `pnpm --filter @retaino/db db:generate`.
- [ ] Run `pnpm --filter @retaino/db test`.
- [ ] Run `pnpm --filter @retaino/db typecheck`.

### Phase 3: Stripe Client And Catalog Config

- [ ] Install `stripe` in `apps/api`.
- [ ] Add Stripe environment bindings to `apps/api/src/types.ts`.
- [ ] Add a focused Stripe client factory in `apps/api/src/lib/stripe.ts`.
- [ ] Add `apps/api/src/features/billing/billing.catalog.ts` with price ID
  mapping from environment variables.
- [ ] Add Stripe config for per-checkout display name. Do not require changing
  the Stripe account-level public business name to Retaino.
- [ ] Test catalog validation without contacting Stripe.

### Phase 4: Billing API Routes

- [ ] Add billing service functions for status, checkout, portal, credit checks,
  and credit debits.
- [ ] Add authenticated billing routes.
- [ ] Wire routes in `apps/api/src/server.ts`.
- [ ] Require `org:admin` for checkout and portal creation.
- [ ] Let members read billing status if useful for campaign readiness, but keep
  payment actions admin-only.
- [ ] Add API route tests with a fake Stripe client.
- [ ] Run `pnpm --filter @retaino/api test`.
- [ ] Run `pnpm --filter @retaino/api typecheck`.

### Phase 5: Stripe Webhooks

- [ ] Add `/v1/billing/webhooks` before Clerk auth and protect it with Stripe
  webhook signature validation.
- [ ] Store every accepted event idempotently.
- [ ] Process `checkout.session.completed` for credit pack purchases.
- [ ] Process `invoice.paid` for subscription credit grants.
- [ ] Process subscription lifecycle events for local billing projection.
- [ ] Process refunds or credit notes as negative credit adjustments when
  needed.
- [ ] Add tests for duplicate events, invalid signatures, subscription renewal,
  credit pack purchase, cancellation, payment failure, and refund adjustment.
- [ ] Run `pnpm --filter @retaino/api test`.

### Phase 6: Billing Web UI

- [ ] Add billing API helpers and query keys.
- [ ] Add billing settings page under `/app/settings/billing`.
- [ ] Display current plan, subscription status, SMS credit balance, tier cards,
  credit pack actions, and portal action.
- [ ] Use existing app shell and settings patterns.
- [ ] Use TanStack Query for API state.
- [ ] Use server-returned checkout URLs for redirects.
- [ ] Do not add tests to `apps/web`.
- [ ] Run `pnpm --filter @retaino/web typecheck`.
- [ ] Do not start the dev server or Playwright from the agent session.

### Phase 7: Campaign Integration Hooks

- [ ] Update campaign sending to call
  `assertOrganizationCanSpendSmsCredits` before live send starts.
- [ ] Update campaign completion to call `debitSmsCreditUsage` after actual SMS
  sends complete.
- [ ] Store estimated and actual SMS segment counts on campaign send records, not
  in Stripe data.
- [ ] Use one active live campaign send per organization to prevent two jobs from
  checking and spending the same Retaino balance at the same time.

### Phase 8: Stripe Test Mode Validation

- [ ] User creates Stripe test products and prices or lets the agent create them
  if Stripe tools are available.
- [ ] User starts the API locally.
- [ ] User runs `stripe listen --forward-to http://127.0.0.1:8787/v1/billing/webhooks`.
- [ ] User copies the webhook secret into local API env.
- [ ] User completes subscription checkout with Stripe test card
  `4242 4242 4242 4242`.
- [ ] Billing status shows active subscription and included credits.
- [ ] User buys a test credit pack.
- [ ] Credits increase in Retaino credit balance.
- [ ] Simulate or perform SMS credit usage debit.
- [ ] Credits decrease in Retaino credit balance.
- [ ] User cancels subscription in the Stripe Customer Portal.
- [ ] Retaino blocks SMS sends without an active subscription.

## Testing Strategy

Use fake Stripe clients for automated tests. Do not make live Stripe API calls in
unit tests.

Automated tests:

- Shared contract schema validation.
- Billing catalog key validation.
- Stripe client configuration.
- Checkout rejects non-admin org members.
- Checkout creates or reuses a customer for the active organization.
- Checkout stores organization metadata.
- Billing status reads local billing projection and credit balance.
- Credit check passes when active subscription exists and balance is enough.
- Credit check fails when subscription is inactive.
- Credit check fails when balance is below estimated segments.
- Credit debit is idempotent by source and source ID.
- Webhook handler rejects invalid signatures.
- Webhook processing is idempotent.
- Subscription renewal grants included credits once.
- Credit pack checkout grants purchased credits once.
- Refund handling creates a correcting credit transaction.

Manual Stripe test-mode tests:

- Subscription checkout success.
- Checkout cancel or return.
- Credit pack purchase.
- Customer Portal access.
- Subscription cancellation.
- Payment failure recovery with Stripe test cards.
- Local webhook forwarding through Stripe CLI.

## Risks And Guardrails

- Do not use Stripe Billing Credits for MVP send authorization.
- Do not maintain mutable credit balance columns without append-only credit
  transactions.
- Do not trust client-supplied organization IDs.
- Do not expose Stripe secret keys to the browser.
- Do not grant SMS credits until Stripe confirms successful payment.
- Do not debit SMS usage before Twilio accepts the send.
- Use idempotency keys and unique credit transaction sources so retries do not
  double-grant or double-spend.
- Keep webhook processing resilient. A webhook miss must be recoverable by
  re-fetching Stripe subscription, customer, checkout session, or invoice data.
- Keep test and live Stripe keys, price IDs, webhook secrets, and webhook
  endpoints separate.

## Execution Order

1. Create Stripe test products and prices.
2. Shared contracts.
3. Database projection, webhook audit, and SMS credit transactions.
4. Stripe client and catalog config.
5. API billing status, checkout, portal, and credit services.
6. Webhook endpoint and credit transaction processing.
7. Billing web UI.
8. Stripe test-mode end-to-end validation.
9. Campaign credit integration.

## Completion Criteria

- Organization admins can subscribe through Stripe Checkout.
- Organization admins can buy credit packs through Stripe Checkout.
- Organization admins can open the Stripe Customer Portal.
- Retaino can read active subscription and SMS credit balance.
- Retaino grants included monthly credits after successful subscription payment.
- Retaino grants purchased credits after successful credit pack payment.
- Retaino blocks SMS sends when subscription or credits are insufficient.
- Retaino debits actual SMS segment usage after Twilio accepts sends.
- Stripe webhooks are signature-validated, stored idempotently, and reflected in
  local billing projection and credit transactions.
