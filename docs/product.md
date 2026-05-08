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

The user imports a customer list, selects lapsed customers, writes an SMS offer,
sends a campaign, and later sees which bookings and revenue can be attributed to
that campaign.

The dashboard should answer one question:

> How many bookings and how much revenue came from this campaign?

## Build Order

1. Organization setup, compliance acceptance, and team access.
2. Contact import with validation, dedupe, and suppression checks.
3. Audience readiness and lapsed customer segmentation.
4. Campaign drafts, SMS preview, segment counting, and test sends.
5. Short links and campaign send execution.
6. Booking CSV upload and reconciliation.
7. Campaign reporting with attribution confidence.

Organization setup is already the foundation. The next product area should be
contacts import because campaigns and reporting depend on customer data.

## MVP Scope

Required:

- organization-scoped product data and access control
- self-serve onboarding with legal company profile and compliance acceptance
- CSV customer import with field mapping, validation, dedupe, and suppression
  checks
- lapsed customer segmentation rules, such as no booking in X days
- SMS editor with GSM-7 and Unicode segment counter plus cost preview
- per-recipient short links for click tracking
- campaign code or offer code for manual attribution
- campaign dashboard for sent, delivered, failed, clicked, replies, opt-outs,
  bookings, revenue, and attribution confidence
- STOP handling and suppression lists
- booking CSV upload and reconciliation
- strict tenant scoping for every imported, generated, and matched record

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
4. User accepts required compliance documents.
5. User confirms campaigns only contact eligible recipients for the customer's
   own services.
6. Retaino enables default STOP text and suppression handling.

### Audience Import

1. User uploads a CSV customer list.
2. Retaino maps fields such as name, phone, email, last booking date, service,
   and marketing status when available.
3. Retaino validates phone numbers and emails.
4. Retaino deduplicates records inside the organization.
5. Retaino removes suppressed contacts.
6. Retaino stores normalized contact fields and hashes for matching.

### Campaign Creation

1. User chooses a lapsed customer segment.
2. User writes SMS copy.
3. Retaino counts SMS segments and warns when Unicode increases cost.
4. User chooses a target booking URL and optional campaign code.
5. Retaino creates one tracked link per recipient.
6. User sends a test SMS.
7. User approves the live send.

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
- Keep long-running work in background jobs.
- Keep the product narrow until the import, campaign, and reporting loop works
  end to end.
