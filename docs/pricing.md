# Pricing

Retaino pricing should be simple, usage-aware, and easy to implement. The
product should not restrict normal usage with artificial feature gates in MVP.

## Pricing Model

Use three subscription tiers with the same core product features. Tiers differ
by included monthly SMS segment credits.

All paid tiers include:

- unlimited users
- unlimited organizations per user
- unlimited contacts
- unlimited imports
- unlimited campaign drafts
- campaign sending
- tracking links
- basic campaign reporting
- booking attribution later

Do not enforce these as Stripe entitlements for MVP. Present them as included product
value and keep the app implementation simple.

## Credit Definition

One credit equals one SMS segment.

Examples:

- 1 recipient x 1 segment = 1 credit
- 1 recipient x 2 segments = 2 credits
- 500 recipients x 2 segments = 1,000 credits

This matches how SMS vendors commonly explain credits. Longer or Unicode
messages can consume multiple credits.

## Cost Assumptions

Current planning assumptions:

- Twilio Sweden outbound SMS: USD 0.0646 per segment.
- Planning exchange rate: about 9.28 SEK per USD.
- Estimated Twilio cost: about 0.60 SEK per outbound segment.
- Stripe subscription fee estimate: 2.7% + 1.80 SEK per transaction. This
  includes 1.5% + 1.80 SEK for standard EEA cards, 0.7% Stripe Billing, and
  0.5% Stripe Tax Basic where tax calculation applies.
- Stripe one-time credit pack fee estimate: 2.0% + 1.80 SEK per transaction.
  This includes 1.5% + 1.80 SEK for standard EEA cards and 0.5% Stripe Tax
  Basic where tax calculation applies.
- Planning sender cost: 30 SEK per organization per month when a dedicated
  numeric sender is needed.
- Prices below are listed ex VAT for business customers.

Recalculate this model whenever Twilio pricing, carrier fees, exchange rates,
or Stripe fees change.

Sources:

- Twilio Sweden SMS pricing: https://www.twilio.com/en-us/sms/pricing/se
- Twilio Pricing API: https://www.twilio.com/docs/messaging/api/pricing
- Stripe Sweden pricing: https://stripe.com/en-se/pricing
- Stripe Billing credits: https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits
- Stripe usage metering: https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage-api
- Stripe restricted businesses: https://stripe.com/legal/restricted-businesses
- Wise USD to SEK reference: https://wise.com/gb/currency-converter/usd-to-sek-rate/history

## Subscription Tiers

Recommended MVP tiers:

| Tier | Monthly price | Included credits | Effective credit price | Intended customer |
| --- | ---: | ---: | ---: | --- |
| Starter | 699 SEK | 300 | 2.33 SEK | small teams testing reactivation |
| Growth | 1,499 SEK | 1,000 | 1.50 SEK | regular monthly campaigns |
| Scale | 2,999 SEK | 3,000 | 1.00 SEK | larger lists or several campaigns |

Mark Growth as the recommended plan. It should feel like the normal default for
businesses that expect to run regular campaigns. Starter should feel safe and
low-friction, while Scale should feel like better economics for higher monthly
volume.

Do not make higher tiers unlock major software features in MVP. The reason to
upgrade is more included credits, fewer top-ups, and a lower effective credit
price.

In the billing UI, show each tier as the same workflow with different credit
capacity. Keep plan subtitles short, put included credits and effective credit
price in the included list, and avoid separate capacity calculators.

## Credit Packs

Organizations can buy extra credit packs when they need more SMS capacity.

Recommended MVP packs:

| Pack | Price | Effective credit price |
| --- | ---: | ---: |
| 500 credits | 595 SEK | 1.19 SEK |
| 1,500 credits | 1,650 SEK | 1.10 SEK |
| 5,000 credits | 5,000 SEK | 1.00 SEK |

Larger packs save some money because they improve cash flow and reduce payment
friction. The discount is intentionally modest so subscriptions remain the
primary pricing structure.

Included monthly credits do not roll over. Purchased credit packs do roll over
and do not expire in MVP. Retaino requires an active subscription before an
organization can use purchased credits for live sends or test sends.

In the billing UI, credit pack cards should show the pack size once, the pack
price, and a short included list with effective credit price and rollover
policy. Do not repeat the credit count in body copy.

## Tax Policy

Retaino is B2B first. Show prices ex VAT in the app and pricing page.

Use Stripe Checkout and Stripe Tax for tax calculation. Configure Stripe prices
and checkout copy so the app-facing price is ex VAT. Stripe should calculate and
itemize tax at checkout when tax is due. If the customer can use a valid
business tax registration for reverse charge, Stripe should handle that in
checkout where supported.

The profit model uses product prices before VAT or sales tax. Taxes collected
from customers are not treated as Retaino revenue.

## Billing Rules

- Stripe is the source of truth for payments, subscriptions, checkout sessions,
  and customer portal sessions.
- Retaino is the source of truth for operational SMS credit balance.
- One Stripe customer maps to one Retaino organization.
- Store `organizationId` in Stripe customer metadata and checkout metadata.
- Retaino stores SMS credit transactions funded by Stripe webhooks.
- Billing status, subscription checkout, credit pack checkout, and customer
  portal access are exposed through authenticated billing API routes.
- Stripe webhooks are unauthenticated product routes mounted before Clerk auth
  and protected by Stripe signature validation.
- Live send checks credits once for the full campaign estimate.
- Retaino blocks live send if the organization has insufficient credits.
- Retaino allows only one active live send per organization at a time.
- Test sends consume credits.
- Actual SMS segment usage is recorded as a Retaino credit transaction after
  sends.
- An active subscription is required to send SMS, even if the organization has
  purchased credits available.
- Do not create a metered overage price in Stripe for MVP. Use credits-only
  spending so customers cannot receive surprise usage invoices.
- Do not use Stripe Billing Credits for MVP credit enforcement. Stripe Billing
  Credits are public preview and apply to invoices at finalization, while
  Retaino must block SMS before provider cost is incurred.
- Use Twilio public pricing for planning and the Twilio Pricing API only as an
  operational launch check when account credentials are available.

## Profit Model

The tables below use the planning assumptions above and assume each customer
uses every included credit. They account for conservative Stripe payment fees,
estimated Twilio SMS segment cost, and a 30 SEK monthly sender cost. They do
not include company income tax, salaries, support time, hosting, payout fees,
refunds, disputes, or future vendor costs.

Subscription gross profit estimate:

| Tier | Price | Credits used | Stripe fee | SMS cost | Sender cost | Estimated gross profit |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Starter | 699 SEK | 300 | 21 SEK | 180 SEK | 30 SEK | 468 SEK |
| Growth | 1,499 SEK | 1,000 | 42 SEK | 600 SEK | 30 SEK | 827 SEK |
| Scale | 2,999 SEK | 3,000 | 83 SEK | 1,800 SEK | 30 SEK | 1,086 SEK |

Credit pack gross profit estimate:

| Pack | Price | Credits used | Stripe fee | SMS cost | Estimated gross profit |
| --- | ---: | ---: | ---: | ---: | ---: |
| 500 credits | 595 SEK | 500 | 14 SEK | 300 SEK | 281 SEK |
| 1,500 credits | 1,650 SEK | 1,500 | 35 SEK | 900 SEK | 715 SEK |
| 5,000 credits | 5,000 SEK | 5,000 | 102 SEK | 3,000 SEK | 1,898 SEK |

Approximate organizations needed for 80,000 SEK monthly gross profit if all
included credits are used:

| Scenario | Organizations needed |
| --- | ---: |
| all Starter | 171 |
| all Growth | 97 |
| all Scale | 74 |
| 50 Starter, 50 Growth, 20 Scale | about 86,500 SEK gross profit |

This target is easier if customers do not use every included credit, buy extra
credit packs, or share sender infrastructure. It is harder if Twilio pricing,
exchange rates, support costs, or provider fees increase.

## Pricing Psychology

Use a good, better, best structure:

- Starter anchors a low-risk entry point.
- Growth is the default and should be visually recommended.
- Scale anchors value for higher-volume senders and makes Growth feel
  reasonable.

The tiers should be easy to compare in under 10 seconds. Avoid complicated
feature matrices in MVP because all tiers include the same product capabilities.

Competitor patterns:

- SMS platforms commonly use credits where one standard SMS segment equals one
  credit.
- Many plans bundle monthly credits, then sell extra credits.
- Larger tiers or packs often have a lower effective price per credit.
- The tier ladder should not be too steep for MVP. The current price ratio is
  about 2.1x from Starter to Growth and about 4.3x from Starter to Scale, which
  is a reasonable B2B good, better, best shape.

References:

- SimpleTexting pricing: https://simpletexting.com/pricing/
- EZ Texting pricing: https://www.eztexting.com/pricing
- EZ Texting credit usage: https://www.eztexting.com/resources/sms-resources/ez-texting-credit-usage
- SlickText pricing: https://www.slicktext.com/pricing
- SlickText credits: https://help.slicktext.com/understanding-message-credits-usage-counting-and-rollovers-1
- Mailchimp SMS credits: https://mailchimp.com/help/about-sms-marketing-credits/
- Brevo SMS pricing: https://help.brevo.com/hc/en-us/articles/208717449-Supported-countries-and-pricing-for-SMS-messages
- Klaviyo pricing: https://www.klaviyo.com/pricing
- Zuora good, better, best research: https://www.zuora.com/wp-content/uploads/pdf/tapping_into_the_subscriber_psychology_with_good_better_best_ebook.pdf

## Launch Decisions

- Use the three tiers and three credit packs listed above for MVP.
- Mark Growth as recommended.
- Show all prices ex VAT.
- Configure Stripe Checkout and Stripe Tax so displayed product prices are ex
  VAT.
- Included monthly credits do not roll over.
- Purchased credits roll over and do not expire in MVP.
- Require an active subscription to use any SMS credits.
- Use credits-only spending in Retaino. Do not enable automatic overage billing
  in MVP.
- All tiers include the same product workflow in MVP. Credits are the only
  in-app plan difference.
- Recalculate this page when Twilio, Stripe, tax, or exchange-rate assumptions
  change.
