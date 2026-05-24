# Product

Retaino v1 is a vertical SaaS for SMS-based customer reactivation. It is not a
generic SMS gateway, CRM, or booking system.

Product promise: reactivate previous customers and show bookings and revenue,
not just sent SMS.

## Target Customers

Start with service businesses where one recovered booking has clear margin
value and the business already has customer relationships:

- salons and beauty businesses
- aesthetic clinics, without health notes or journal data
- PT studios and small fitness studios
- car service, tire, and workshop businesses

Avoid broad SMB positioning in v1.

## Core Workflow

The user imports contacts, creates a campaign, chooses eligible lapsed
customers, writes an SMS offer, sends it, and later reports bookings and
revenue.

The dashboard should answer: how much campaign activity happened, and what
bookings and revenue did the team report afterward?

## Build Order

1. Organization setup, legal bundle acceptance, and team access.
2. Billing setup with Stripe subscriptions, credit packs, and SMS balance.
3. Contact import with permission attestation, validation, dedupe, and
   suppression checks.
4. Campaign creation with internal draft persistence and campaign-owned
   lapsed-customer audience rules.
5. Dedicated organization SMS sender setup, SMS preview, segment counting, and
   test sends.
6. Campaign launch with recipient snapshots, short links, and send execution.
7. Manual booking reports for campaign outcome reporting.
8. Spreadsheet booking import and reconciliation after manual reporting proves
   useful.

## MVP Scope

Required:

- organization-scoped product data and access control
- self-serve onboarding with legal company profile, billing details,
  responsible contact, sender-compliance company fields, and one legal bundle
  acceptance
- self-serve billing with Stripe subscriptions, credit packs, and portal access
- CSV contact import with field mapping, validation, dedupe, and suppression
  checks
- contact permission attestation inside the import flow
- campaign-owned lapsed-customer audience rules with internal draft
  persistence
- one dedicated SMS-capable sender number and Messaging Service per
  organization
- SMS editor with GSM-7 and Unicode segment counter plus credit preview
- per-recipient short links
- campaign code, offer code, or campaign reference for manual outcome reporting
- STOP handling, suppression lists, and retention of other inbound replies for
  future inbox support
- manual booking reports for campaign bookings and revenue
- campaign dashboard for delivery, clicks, replies, opt-outs, reported
  bookings, and reported revenue

Deferred:

- full shared inbox, manual replies, assignments, and notifications
- email, WhatsApp, RCS, and broad omni-channel flows
- advanced automation, CDP behavior, AI copy generation, and experiments
- generic CRM features
- more than one or two booking integrations
- spreadsheet booking import and automatic reconciliation until manual outcome
  reporting proves the workflow
- saved reusable segments until campaign-owned audience rules prove repetitive
- import of medical notes, journal data, treatment notes, or sensitive
  unsupported fields

## Main Flows

Onboarding:

1. User signs up or accepts an organization invitation.
2. Retaino ensures the user has an active organization.
3. User enters legal company identity, billing details, responsible contact,
   and sender-compliance company fields Retaino can know upfront.
4. User accepts the current organization legal bundle.
5. Retaino enables forced STOP text and suppression handling.

Billing:

1. Admin chooses Starter, Growth, or Scale in Stripe Checkout.
2. Retaino grants included monthly SMS credits after Stripe confirms payment.
3. Admin can buy one-time credit packs when more credits are needed.
4. Billing shows subscription status, SMS balance, renewal timing, plans, credit
   packs, and portal access.
5. Retaino does not provision a Twilio sender during checkout. Sender setup
   happens later when a user prepares the first campaign for sending.

Contact import:

1. User uploads a CSV customer list.
2. Retaino maps name, phone, email, and last booking date when available.
3. User confirms the contacts can lawfully receive marketing SMS.
4. Retaino validates, deduplicates, removes suppressed contacts, and stores
   normalized fields plus hashes for matching.

Campaign:

1. User creates a campaign and chooses the eligible lapsed audience.
2. User writes SMS copy.
3. Retaino counts segments and shows the estimated SMS use in plain language.
4. User chooses a booking URL and optional campaign code or reference that can
   help with manual outcome reporting.
5. User chooses the sender country based on recipient market and selects an
   available two-way SMS number or accepts Retaino's recommendation.
6. Retaino provisions the organization's dedicated sender if it does not exist.
7. User reviews the final campaign, estimated credits, sender, and recipient
   count.
8. User sends a test SMS.
9. User sends the campaign. Retaino then freezes the selected recipients,
   creates one tracked link per recipient, reserves credits, and sends through a
   background job.

Reporting:

1. Retaino records provider delivery state and clicks.
2. User manually reports booking outcomes from the campaign.
3. Retaino stores each reported booking row and totals bookings and revenue.
4. Dashboard separates campaign activity from team-reported outcomes.

## Product Principles

- Sell reactivation and revenue reporting, not cheap SMS transport.
- Be honest about outcomes. Do not present manually reported bookings as
  automatic attribution.
- Make SMS credit use visible before sending.
- Use prepaid credits only in MVP. Do not create surprise usage invoices.
- Keep long-running work in background jobs.
- Keep the product narrow until import, campaign, and reporting work end to end.
- Use draft as a persistence status, not as the main campaign creation outcome.
  User-facing copy should say campaign, not campaign draft, except in list
  status labels.
