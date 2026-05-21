# Campaigns

Campaigns are Retaino's main workflow for SMS reactivation. Keep the product
focused on one audience, one SMS message, and one booking destination per
campaign.

## User Flow

1. Choose the lapsed-customer audience.
2. Write the SMS.
3. Add booking URL and optional campaign reference.
4. Set up or confirm the organization sender.
5. Review recipients, credits, sender, and message preview.
6. Send a test SMS.
7. Send the campaign.

Draft is an internal persistence status. User-facing copy should focus on
building and sending the campaign, not "creating a draft".

## Send Rules

- The final `Send campaign` action owns launch behavior.
- There is no separate public launch or approve endpoint in MVP.
- Final send freezes the campaign, snapshots eligible recipients, creates
  tracking links, reserves estimated SMS credits, and enqueues an Inngest job.
- Campaign sends run in background jobs, never inside the HTTP request.
- Suppression and sender readiness checks run before queueing and again before
  provider send.
- Only one active live send per organization may run at a time.
- Credit reservations are the database source of truth for send authorization.
  Inngest idempotency is useful, but not enough by itself.

## Audience

Audience rules are campaign-owned, not saved reusable segments. MVP audience
eligibility is based on lapsed booking window, usable phone number, marketing
permission, and suppression status.

Preview, recipient snapshot, and send execution must share the same eligibility
rules. Do not implement separate audience logic in the web app.

## SMS Content

Supported personalization tokens:

- `{first_name}`
- `{last_booking_date}`

Retaino appends the tracked booking link and required opt-out text. Reject
unknown user-authored `{...}` tokens and user-authored unsubscribe, opt-out, or
tracking-link placeholders.

Segment estimates shown in the builder must match the body that will be sent as
closely as possible. Store estimated and actual SMS segment counts.

## Sender

Each organization gets one dedicated two-way SMS-capable sender number and one
provider sender group in MVP. Do not use a shared Retaino number across
organizations.

Users choose sender country and phone number. Retaino chooses the provider
number type needed for two-way SMS support. Do not expose provider number type,
provider IDs, or provider implementation details in public API responses.

Sender provisioning is lazy. Organizations can create campaigns and preview
audiences before a sender exists, but test sends and live sends require a ready
sender with the provider resources needed for delivery and callbacks.

## Access

Organization members can import and manage contacts, create and edit draft
campaigns, set up the sender, send test SMS, send live campaigns, and review
reports after action-specific readiness gates pass.

Organization setup, legal acceptance, billing, and team administration remain
role-gated.

## Deferred

- saved reusable segments
- multiple audiences or message variants inside one campaign
- scheduled and recurring sends
- journeys and automation
- AI copy generation and experiments
- full inbox workflows
- booking reconciliation and attribution matching
