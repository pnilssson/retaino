# Pricing

Retaino pricing is usage-aware but simple. MVP tiers differ by included monthly
SMS segment credits, not product feature gates.

## Credit Rules

- One credit equals one SMS segment.
- Longer or Unicode messages can consume multiple credits.
- Included monthly credits do not roll over.
- Purchased credit packs roll over and do not expire in MVP.
- An active subscription is required to use any credits for SMS sends.
- Retaino blocks live sends when credits are insufficient.
- Test sends consume credits.
- Live sends reserve estimated credits before provider cost is incurred, then
  reconcile actual segment usage after send completion.
- SMS credit transactions are the source of truth for grants, reservations,
  releases, usage, and adjustments. Available balance is derived from the
  append-only ledger.
- Use credits-only spending. Do not create automatic overage invoices in MVP.

## Subscription Tiers

All paid tiers include the same product workflow:

- unlimited users
- unlimited organizations per user
- unlimited contacts
- unlimited imports
- unlimited campaign drafts
- campaign sending
- tracking links
- basic campaign reporting
- booking attribution later

Do not enforce these as Stripe entitlements for MVP.

| Tier | Monthly price | Included credits | Effective credit price | Intended customer |
| --- | ---: | ---: | ---: | --- |
| Starter | 699 SEK | 300 | 2.33 SEK | first reactivation test |
| Growth | 1,499 SEK | 1,000 | 1.50 SEK | regular monthly campaigns |
| Scale | 2,999 SEK | 3,000 | 1.00 SEK | larger lists or several campaigns |

Mark Growth as recommended. Starter should feel low-risk. Scale should make
Growth feel reasonable while offering better economics for higher volume.

## Credit Packs

| Pack | Price | Effective credit price |
| --- | ---: | ---: |
| 500 credits | 595 SEK | 1.19 SEK |
| 1,500 credits | 1,650 SEK | 1.10 SEK |
| 5,000 credits | 5,000 SEK | 1.00 SEK |

Credit packs are one-time purchases for organizations that need more capacity
inside the month. Discounts are modest so subscriptions remain the primary
pricing structure.

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

- Stripe is the source of truth for payments, subscriptions, checkout sessions,
  and customer portal sessions.
- Retaino is the source of truth for operational SMS credit balance.
- One Stripe customer maps to one Retaino organization.
- Store `organizationId` in Stripe customer metadata and checkout metadata.
- Billing status, checkout, credit pack checkout, and portal routes are
  authenticated API routes.
- Stripe webhooks are mounted before Clerk auth and protected by Stripe
  signature validation.
- Stripe webhooks fund Retaino SMS credit transactions.
- Do not use Stripe metered overage billing in MVP.
- Do not use Stripe Billing Credits for MVP credit enforcement.

## Credit Transaction Types

Use explicit transaction types rather than spreading credit state across
campaign, billing, and message records:

- `subscription_grant`
- `credit_pack_grant`
- `campaign_send_reservation`
- `campaign_send_release`
- `campaign_send_adjustment`
- `test_send_reservation`
- `test_send_release`
- `refund_adjustment`

Every transaction has an idempotency key tied to the source action, such as
`campaign:{campaignId}:reservation`, `campaign:{campaignId}:reconcile`, or
`test-send:{testSendId}:reservation`.

## Tax

Retaino is B2B first. App and pricing page prices are ex VAT. Stripe Checkout
and Stripe Tax calculate and itemize tax when due.

## Planning Assumptions

Recalculate before pricing changes or launch in a new market:

- Twilio Sweden outbound SMS: USD 0.0646 per segment.
- Planning exchange rate: about 9.28 SEK per USD.
- Estimated Twilio cost: about 0.60 SEK per outbound segment.
- Stripe subscription fee estimate: 2.7% + 1.80 SEK per transaction.
- Stripe one-time credit pack fee estimate: 2.0% + 1.80 SEK per transaction.
- Planning sender cost: 30 SEK per organization per month when a dedicated
  numeric sender is needed.

Primary references: Twilio SMS pricing, Twilio Pricing API, Stripe Sweden
pricing, Stripe Tax, Stripe usage-based billing docs, and Stripe restricted
businesses.
