# Product

Retaino v1 is a vertical SaaS for SMS-based customer reactivation. It is not a generic SMS gateway, CRM, or booking system.

Product promise: reactivate previous customers and show bookings and revenue, not just sent SMS.

## Target Customers

Start with service businesses where one recovered booking has clear margin value and the business already has customer relationships:

- salons and beauty businesses
- aesthetic clinics, without health notes or journal data
- PT studios and small fitness studios
- car service, tire, and workshop businesses

Avoid broad SMB positioning in v1.

## MVP Scope

Required:

- organization-scoped product data and access control
- self-serve onboarding with legal company profile, billing details, responsible contact, sender-compliance company fields, and legal bundle acceptance
- self-serve Stripe billing with subscriptions, credit packs, and portal access
- CSV contact import with field mapping, validation, dedupe, suppression checks, and permission attestation
- campaign-owned lapsed-customer audience rules with internal draft persistence
- one dedicated two-way SMS-capable sender number and Messaging Service per organization
- SMS editor with GSM-7 and Unicode segment counter plus credit preview
- per-recipient short links
- campaign code, offer code, or campaign reference for manual outcome reporting
- STOP handling and suppression lists
- shared organization inbox for inbound replies and manual SMS replies
- reported bookings for campaign bookings and revenue
- campaign dashboard for delivery, clicks, replies, opt-outs, reported bookings, and reported revenue

Deferred:

- per-user inbox assignments, notes, labels, and read state
- email, WhatsApp, RCS, and broad omni-channel flows
- advanced automation, journeys, CDP behavior, AI copy generation, and experiments
- generic CRM features
- more than one or two booking integrations
- spreadsheet booking import and automatic reconciliation until manual reporting proves useful
- saved reusable segments until campaign-owned audience rules prove repetitive
- medical notes, journal data, treatment notes, and sensitive unsupported fields

## Core Workflow

The user imports contacts, creates a campaign, chooses eligible lapsed customers, writes an SMS offer, sends it, handles replies in the inbox, and reports bookings and revenue.

The dashboard should answer how much campaign activity happened and what bookings and revenue the team reported afterward.

## Campaigns

Keep campaigns focused on one audience, one SMS message, and one booking destination.

User flow:

1. Choose the lapsed-customer audience.
2. Write the SMS.
3. Add booking URL and optional campaign reference.
4. Set up or confirm the organization sender.
5. Review recipients, credits, sender, and message preview.
6. Send a test SMS.
7. Send the campaign.

Rules:

- Draft is an internal persistence status. User-facing copy should say campaign, not campaign draft, except in list status labels.
- After send, show campaign overview and report. Do not show builder controls for locked campaigns.
- The final `Send campaign` action owns launch behavior. There is no separate public launch or approve endpoint in MVP.
- Final send freezes the campaign, snapshots eligible recipients, creates tracking links, reserves estimated SMS credits, and enqueues an Inngest job.
- Campaign sends run in background jobs, never inside the HTTP request.
- Suppression and sender readiness checks run before queueing and again before provider send.
- Only one active live send per organization may run at a time.
- Credit reservations are the database source of truth for send authorization. Inngest idempotency is useful, but not enough by itself.

## Audience

Audience rules are campaign-owned, not saved reusable segments. MVP eligibility is based on lapsed booking window, usable phone number, marketing permission, and suppression status.

Preview, recipient snapshot, and send execution must share the same eligibility rules. Do not implement separate audience logic in the web app.

Campaign-owned audience rules may also exclude contacts who already received selected previous campaigns. This uses campaign recipient send history, not preview membership.

Retaino applies a standard recent campaign protection window of 30 days. Users may lower or disable it for timely campaigns, but final send must require an explicit confirmation when the standard window is relaxed.

## SMS Content

Supported personalization tokens:

- `{first_name}`
- `{last_booking_date}`

Retaino appends the tracked booking link and required opt-out text. Reject unknown user-authored `{...}` tokens and user-authored unsubscribe, opt-out, or tracking-link placeholders.

Segment estimates shown in the builder must match the body that will be sent as closely as possible. Store estimated and actual SMS segment counts.

## Inbox

The inbox is part of MVP because Retaino sells reactivation and retention, not one-way bulk SMS.

Rules:

- The inbox is organization-scoped and threaded by SMS phone identity, not by campaign.
- A customer who receives campaign 1, replies, then later receives campaign 2 has one continuous conversation.
- Campaign context appears as message metadata, not as the primary thread grouping.
- Default view is `Needs reply`: latest inbound message is newer than latest outbound message and the phone is not suppressed.
- Additional views are `Unread` and `All conversations`.
- List order is newest message first. Thread order is oldest message first.
- Sidebar shows unread conversation count.
- Active thread is marked read when opened or when the user clicks a read action.
- Manual replies send exactly the user-authored reply body. Do not append campaign booking links or campaign opt-out copy to manual replies.
- Manual reply UI uses TanStack Form and keeps one `clientRequestId` for the current unchanged draft until it succeeds or the user changes or resets the message.
- The reply box is disabled for suppressed conversations.
- No email notifications, browser push notifications, or realtime WebSocket channel in MVP.

## Tracking

Every campaign SMS contains a unique short link for one campaign recipient, for example `https://go.retaino.com/r/0123456789abcdef`.

The short link record stores organization ID, campaign ID, recipient ID, target booking URL, short code, and timestamps. Recipient hashes stay on the campaign recipient snapshot and are not duplicated on tracking links.

Redirect flow:

1. Recipient opens `/r/:code`.
2. API looks up the link by short code.
3. API verifies the stored booking URL still uses an allowed `http` or `https` scheme.
4. API records a click event with timestamp, user agent, and organization ID.
5. API redirects to the stored booking URL.

Redirects favor the recipient reaching the booking page. If click storage fails after the target URL has been validated, the redirect still succeeds and the write failure is logged. MVP click tracking does not persist IP addresses or IP-derived metadata.

Click tracking owns clicks only. It does not own reported bookings or attribution.

## Reporting

Retaino reports campaign activity and team-reported outcomes separately.

Campaign activity includes selected recipients, sent messages, delivered messages, failed messages, skipped recipients, click count, unique clickers, replies, opt-outs, estimated SMS credits, and actual SMS credits.

Reported outcomes include reported booking count, reported revenue, booking rate, and average booking revenue.

Reported bookings store campaign, campaign recipient, contact, reporting user, booking date, source, optional service, optional revenue, and optional note. They do not duplicate contact names, phone numbers, or email addresses.

Users enter normal currency amounts. Retaino stores revenue as integer minor units using the campaign outcome currency. If historical or imported data contains mixed revenue currencies for one campaign, reports must not show one summed revenue total.

Reports must label team-reported outcomes clearly. Do not imply click tracking or manual reporting proves automatic attribution.

## Future Attribution

Never match across organizations. Internal `organizationId` is required in every query.

Possible future matching inputs:

- campaign code, offer code, or campaign reference
- normalized phone or phone hash
- normalized email or email hash
- name plus phone suffix
- booking date
- service name
- booking created time after sent time or click time

When multiple campaigns match, prefer the most recent campaign inside the attribution window. When multiple recipients match one booking, choose strongest confidence, then closest click time, then closest sent time. Do not count the same booking twice.

## Product Principles

- Sell reactivation and revenue reporting, not cheap SMS transport.
- Be honest about outcomes. Do not present manually reported bookings as automatic attribution.
- Make SMS credit use visible before sending and before manual replies.
- Use prepaid credits only in MVP. Do not create surprise usage invoices.
- Keep long-running work in background jobs.
- Keep the product narrow until import, campaign, inbox, and reporting work end to end.
