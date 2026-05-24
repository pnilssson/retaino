# Pricing

Retaino pricing is usage-aware but simple. MVP tiers differ by included monthly SMS segment credits, not product feature gates.

## Credit Rules

- One credit equals one SMS segment.
- Longer or Unicode messages can consume multiple credits.
- Included monthly credits do not roll over.
- Purchased credit packs roll over and do not expire in MVP.
- An active subscription is required to use any credits for SMS sends.
- Test sends, live campaign sends, and manual inbox replies consume credits.
- Retaino blocks sends and replies when credits are insufficient.
- Sends reserve estimated credits before provider cost is incurred, then reconcile actual segment usage after send completion.
- Credits-only spending is required. Do not create automatic overage invoices in MVP.

## Subscription Tiers

All paid tiers include the same product workflow. Do not enforce product features as Stripe entitlements for MVP.

| Tier | Monthly price | Included credits | Effective credit price | Intended customer |
| --- | ---: | ---: | ---: | --- |
| Starter | 699 SEK | 300 | 2.33 SEK | first reactivation test |
| Growth | 1,499 SEK | 1,000 | 1.50 SEK | regular monthly campaigns |
| Scale | 2,999 SEK | 3,000 | 1.00 SEK | larger lists or several campaigns |

Mark Growth as recommended. Starter should feel low-risk. Scale should make Growth feel reasonable while offering better economics for higher volume.

## Credit Packs

| Pack | Price | Effective credit price |
| --- | ---: | ---: |
| 500 credits | 595 SEK | 1.19 SEK |
| 1,500 credits | 1,650 SEK | 1.10 SEK |
| 5,000 credits | 5,000 SEK | 1.00 SEK |

Credit packs are one-time purchases for organizations that need more capacity inside the month. Discounts are modest so subscriptions remain the primary pricing structure.

## Billing UI

- Show prices ex VAT.
- Show tax as calculated in checkout.
- Keep plan subtitles short and below the price.
- Keep included credits and effective credit price in each plan list.
- Keep rollover policy and effective credit price in each credit pack list.
- Do not repeat credit counts in subtitles or body copy.
- Do not show separate capacity calculators.
- Do not present higher tiers as unlocking major software features.

## Stripe Rules

- Stripe is the source of truth for payments, subscriptions, checkout sessions, and customer portal sessions.
- Retaino is the source of truth for operational SMS credit balance.
- One Stripe customer maps to one Retaino organization.
- Store `organizationId` in Stripe customer metadata and checkout metadata.
- Billing status, checkout, credit pack checkout, and portal routes are authenticated API routes.
- Stripe webhooks are mounted before Clerk auth and protected by Stripe signature validation.
- Stripe webhooks update Retaino SMS credit balances and write matching SMS credit transactions.
- Do not use Stripe metered overage billing in MVP.
- Do not use Stripe Billing Credits for MVP credit enforcement.

Keep Stripe test mode local and Stripe live mode deployed. Never mix local webhook secrets, development price IDs, or production services across environments.

## Credit Transaction Model

`organization_billing_profiles` stores the local Stripe subscription projection used to check whether an organization can spend SMS credits.

SMS credit transactions are the immutable source of truth for grants, reservations, releases, usage, and adjustments. Available balance is derived from spendable ledger rows.

`transactionType` describes the financial action:

- `grant`
- `debit`
- `adjustment`

Campaign and billing intent lives in `source` and `sourceId`.

Use these sources:

- `campaign_send` for live campaign sends
- `campaign_test_send` for test sends
- `manual_reply` for manual inbox replies

Use idempotent `sourceId` values:

- `campaign-send:{campaignId}`
- `campaign-send:{campaignId}:recipient:{recipientId}`
- `campaign-send:{campaignId}:release`
- `manual-reply:{conversationId}:{clientRequestId}`
- `manual-reply:{conversationId}:{clientRequestId}:release`

If a reservation was fully released before the background send could run, a retry may append a fresh attempt suffix after `campaign-send:{campaignId}` and release against that exact attempt source.

Manual reply clients must reuse the same `clientRequestId` for the current unchanged draft across retries. Otherwise a lost response after provider acceptance can create a second billable SMS.

## Tax And Planning Assumptions

Retaino is B2B first. App and pricing page prices are ex VAT. Stripe Checkout and Stripe Tax calculate and itemize tax when due.

Recalculate before pricing changes or launch in a new market:

- Twilio Sweden outbound SMS: USD 0.0646 per segment.
- Planning exchange rate: about 9.28 SEK per USD.
- Estimated Twilio cost: about 0.60 SEK per outbound segment.
- Stripe subscription fee estimate: 2.7% + 1.80 SEK per transaction.
- Stripe one-time credit pack fee estimate: 2.0% + 1.80 SEK per transaction.
- Planning sender cost: 30 SEK per organization per month when a dedicated numeric sender is needed.
