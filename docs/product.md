# Product

Retaino v1 is a vertical SaaS for SMS-based customer reactivation. It is not a
generic SMS gateway, CRM, or booking system.

The product promise is:

> Reactivate previous customers and show bookings and revenue, not just sent
> SMS.

## Target Customers

Start with service businesses where one recovered booking has clear margin value
and the business already has a customer relationship:

- salons and beauty businesses
- aesthetic clinics, without importing health notes or journal data
- PT studios and small fitness studios
- car service, tire, and workshop businesses

Avoid broad SMB positioning in v1. The first product should work best for
businesses with existing customer lists and repeat booking behavior.

## Core Workflow

The user imports a customer list, creates a campaign, chooses the eligible
lapsed audience inside that campaign, writes an SMS offer, sends it, and later
sees which bookings and revenue can be attributed to that campaign.

The dashboard should answer one question:

> How many bookings and how much revenue came from this campaign?

## Delivery Order

Build product areas in dependency order so later work has the required tenant,
legal, and data foundations:

1. Organization setup, legal bundle acceptance, and team access.
2. Billing setup with Stripe subscriptions, credit packs, and SMS credit
   balance.
3. Contact import with permission attestation, validation, dedupe, and
   suppression checks.
4. Campaign drafts with audience selection for eligible lapsed customers.
5. SMS preview, segment counting, and test sends.
6. Short links and campaign send execution.
7. Booking CSV upload and reconciliation.
8. Campaign reporting with attribution confidence.

## MVP Scope

Required:

- organization-scoped product data and access control
- self-serve onboarding with legal company profile and one legal bundle
  acceptance
- self-serve billing with Stripe subscriptions, credit packs, and customer
  portal access
- CSV customer import with field mapping, validation, dedupe, and suppression
  checks, gated by contact permission attestation
- campaign audience rules for lapsed customers, such as no booking in X days
- SMS editor with GSM-7 and Unicode segment counter plus cost preview
- per-recipient short links for click tracking
- campaign code or offer code for manual attribution
- campaign dashboard for sent, delivered, failed, clicked, replies, opt-outs,
  bookings, revenue, and attribution confidence
- STOP handling and suppression lists
- booking CSV upload and reconciliation
- strict tenant scoping for every imported, generated, and matched record

Provider decision:

- Twilio is the MVP SMS provider.
- Use numeric sending for launch so recipients can reply STOP.
- Keep provider-specific behavior behind an internal adapter so Retaino can add
  another SMS provider later without changing campaign workflows or reports.

Nice to have:

- UTM parameters for booking links and GA4-friendly exports
- one booking-system integration if access is practical, preferably Bokadirekt
  for the Swedish market

Defer:

- full shared inbox or two-way support beyond STOP and basic reply routing
- email, WhatsApp, RCS, and broad omni-channel flows
- advanced automation or CDP functionality
- AI copy generation and experiment engines
- generic CRM features
- more than one or two booking integrations
- import of medical notes, journal data, or sensitive treatment notes

## Main Flows

### Onboarding

1. User signs up or accepts an organization invitation.
2. Retaino ensures the user has an active organization.
3. User enters legal company identity, billing details, and responsible contact.
4. User accepts one organization legal agreement covering the Terms, Data
   Processing Agreement, Sending Policy, and related policies.
5. Retaino enables forced STOP text and suppression handling.

### Billing

1. An organization admin chooses Starter, Growth, or Scale in Stripe Checkout.
2. Retaino grants included monthly SMS credits after Stripe confirms payment.
3. An organization admin can buy one-time credit packs when more credits are
   needed.
4. Purchased credits roll over and do not expire in MVP.
5. The billing page shows subscription status, SMS credit balance, renewal
   timing, monthly plans, credit packs, and a Stripe Customer Portal action.

### Audience Import

1. User uploads a CSV customer list.
2. Retaino maps name, phone, email, and last booking date when available.
3. User confirms these contacts can lawfully receive marketing SMS from the
   organization.
4. Retaino validates phone numbers and emails.
5. Retaino deduplicates records inside the organization.
6. Retaino removes suppressed contacts.
7. Retaino stores normalized contact fields and hashes for matching.

### Campaign Creation

1. User creates a campaign and chooses the eligible lapsed audience in the
   campaign flow.
2. User writes SMS copy.
3. Retaino counts SMS segments and warns when Unicode increases cost.
4. User chooses a target booking URL and optional campaign code.
5. Retaino creates one tracked link per recipient.
6. User sends a test SMS.
7. User approves the live send.

Standalone saved segments are deferred. Retaino should start with campaign-owned
audience rules, then add reusable segments later if customers repeatedly need
the same audience definitions across campaigns.

### Campaign Reporting

1. Retaino records sent time and provider delivery state.
2. Retaino records clicks on recipient short links.
3. User uploads booking export after the campaign.
4. Retaino matches bookings to recipients and classifies attribution.
5. Dashboard shows attributed bookings, revenue, confidence, and unmatched rows.

## Product Principles

- Sell reactivation and revenue reporting, not cheap SMS transport.
- Be honest about attribution. Do not present inferred bookings as exact.
- Make SMS cost visible before sending.
- Use prepaid credits only in MVP. Do not create surprise usage invoices.
- Keep long-running work in background jobs.
- Keep the product narrow until the import, campaign, and reporting loop works
  end to end.
