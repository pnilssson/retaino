# Pricing

Retaino pricing is usage-aware but simple. MVP tiers differ by included monthly SMS segment credits, not product feature gates.

## Credit Rules

- One credit equals one SMS segment.
- Longer or Unicode messages can consume multiple credits.
- Included monthly credits roll over for one extra billing cycle.
- An active subscription is required to use any credits for SMS sends.
- Test sends, live campaign sends, and manual inbox replies consume credits.
- Retaino blocks sends and replies when credits are insufficient.
- Retaino releases dedicated sender numbers when subscription access ends so unpaid organizations do not continue creating monthly number cost.
- Sends reserve estimated credits before provider cost is incurred, then reconcile actual segment usage after send completion.
- Credits-only spending is required. Do not create automatic overage invoices in MVP.
- Separate credit purchases are not sold in MVP. Customers choose the plan with the monthly capacity they need.

## Subscription Tiers

All paid tiers include the same product workflow. Do not enforce product features as Stripe entitlements for MVP.

| Tier | Monthly price | Included credits | Intended customer |
| --- | ---: | ---: | --- |
| Starter | 849 SEK | 300 | first reactivation test |
| Core | 1,749 SEK | 750 | small clinics with regular campaigns |
| Growth | 3,249 SEK | 1,500 | regular monthly campaigns |
| Pro | 5,249 SEK | 2,500 | larger lists or several campaigns |
| Scale | 8,249 SEK | 4,000 | heavier monthly sending |
| Advanced | 15,249 SEK | 7,500 | high-volume clinic groups |

The pricing formula is 249 SEK platform access plus 2 SEK per included SMS credit. Mark Growth as recommended. Starter should feel low-risk without making smaller companies pay a worse credit rate.

## Billing UI

- Show prices ex VAT.
- Show tax as calculated in checkout.
- Keep plan subtitles short and below the price.
- Keep included credits and rollover policy clear in the plan list.
- Do not repeat credit counts in subtitles or body copy.
- Do not show separate capacity calculators.
- Do not present higher tiers as unlocking major software features.

## Stripe Rules

- Stripe is the source of truth for payments, subscriptions, checkout sessions, and customer portal sessions.
- Retaino is the source of truth for operational SMS credit balance.
- One Stripe customer maps to one Retaino organization.
- Store `organizationId` in Stripe customer metadata and checkout metadata.
- Billing status, subscription checkout, and portal routes are authenticated API routes.
- Stripe webhooks are mounted before Clerk auth and protected by Stripe signature validation.
- Stripe webhooks update Retaino SMS credit balances and write matching SMS credit transactions.
- Configure the Stripe webhook endpoint to send only these required events: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, and `customer.subscription.resumed`.
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

- `stripe_invoice` for monthly subscription credit grants
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
- Planning sender cost: 30 SEK per organization per month when a dedicated numeric sender is needed.

## Pricing Maintenance

Retaino owns the pricing catalog in code. To add or change a tier:

1. Update the shared billing plan catalog.
2. Create one Stripe Product and recurring monthly Price in each environment.
   Set the product tax code to `txcd_20060055` for Marketing Services and the price tax behavior to `exclusive`.
3. Add or update the generated `STRIPE_PRICE_<PLAN>_ID` binding.
4. Create new dated legal document versions when customer-facing billing terms change.
5. Update this document and run billing tests.
