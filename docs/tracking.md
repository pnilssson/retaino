# Tracking and Attribution

Retaino v1 uses per-recipient short links plus CSV booking reconciliation. This
supports click tracking and honest booking attribution without depending on
booking-system webhooks.

## Entities

Tenant-owned tracking and attribution entities:

| Entity | Purpose |
| --- | --- |
| Contact | Normalized recipient profile. |
| Suppression | Phone or email that must not receive future sends. |
| Import | Customer CSV upload, mapping, validation, and dedupe summary. |
| SmsSender | Dedicated organization sender number and provider configuration. |
| SmsMessage | Durable inbound and outbound SMS message ledger. |
| Campaign | Offer, audience, target URL, attribution window, SMS copy, optional code or reference, status, and spend. |
| CampaignRecipient | Snapshot of one contact inside one campaign. |
| MessageEvent | Provider event normalized to Retaino states. |
| TrackingLink | Unique short link for one campaign recipient. |
| ClickEvent | Timestamped click on a tracking link. |
| BookingImport | Booking CSV upload, mapping, validation, and reconciliation status. |
| Booking | Normalized booking row from upload or future integration. |
| AttributionMatch | Match between booking, campaign, and recipient. |
| AuditLog | Tenant-scoped record of sensitive changes and approvals. |

All tenant-owned entities follow `docs/architecture.md`.

## Provider Events

Store provider callback data only through normalized Retaino message events.
Reports use Retaino states such as queued, sent, delivered, failed, reply, and
opt-out instead of reading Twilio payload fields directly.
Outbound provider delivery status is stored on `SmsMessage`. Campaign recipient
status tracks the send-attempt workflow and is not a duplicate delivery-status
ledger.

Keep provider message IDs for support and dedupe. Inbound replies must be
evaluated for STOP-style opt-outs before future sends.

Each organization uses one dedicated SMS-capable sender number in MVP. Inbound
message routing resolves the organization from the provider sender, service, or
destination phone number before attempting campaign or recipient matching.
Non-STOP inbound replies are stored even when campaign matching is uncertain so
Retaino can add a lightweight inbox later without relying on provider log
backfills.

## Short Links

Every SMS contains a unique short link for one campaign recipient, for example
`https://go.retaino.com/r/0123456789abcdef`.

The short link record stores organization ID, campaign ID, recipient ID, phone
target booking URL, short code, and timestamps. Recipient hashes stay on the
campaign recipient snapshot and are not duplicated on tracking links.

The short code is only a lookup key. Attribution resolves through campaign and
recipient IDs.

## Redirect Flow

1. Recipient opens `/r/:code`.
2. API looks up the link by short code.
3. API verifies the stored booking URL still uses an allowed `http` or `https`
   scheme.
4. API records a click event with timestamp, user agent, and organization ID.
5. API redirects to the stored booking URL.

Redirects must favor the recipient reaching the booking page. If click storage
fails after the target URL has been validated, the redirect still succeeds and
the write failure is logged. Reports count click events directly instead of
depending on denormalized counters.

MVP click tracking does not persist IP addresses or IP-derived metadata.
Redirect abuse protection uses Cloudflare Worker rate-limiting bindings keyed
by the redirect route and tracking code.

## Booking CSV Reconciliation

After a campaign, the business uploads a booking export from a booking system.
Retaino maps booking ID when available, customer name, phone, email, service,
booking date, booking created time, revenue, staff or location, and campaign
code when available.

Reconciliation runs as a background job. The upload UI shows mapping status,
validation errors, matched rows, and unmatched rows.

## Matching

Possible matching inputs:

- normalized phone
- normalized email
- phone hash
- email hash
- name plus phone suffix
- booking date
- service name
- booking created time after sent time or click time
- campaign code, offer code, or campaign reference

Never match across organizations. Internal `organizationId` is required in
every query.

Deterministic MVP order:

1. Exact campaign code, offer code, or campaign reference.
2. Exact normalized phone.
3. Exact normalized email.
4. Name plus phone suffix.
5. Click-assisted time match.
6. Campaign-window time match.

When multiple campaigns match, prefer the most recent campaign inside the
attribution window. When multiple recipients match one booking, choose strongest
confidence, then closest click time, then closest sent time. Do not count the
same booking twice.

## Attribution Classes

| Class | Meaning |
| --- | --- |
| Direct match | Same phone or email as a campaign recipient inside the window. |
| Click-assisted match | Recipient clicked and a matching booking appeared inside the window. |
| Campaign-window match | Recipient received SMS and booked inside the window without a click. |
| Unmatched | No confident attribution. |

Store confidence level and match reason. Low-confidence attribution must be
visibly separated in reports.

Default attribution window is 7 days. Support 3, 14, and 30 day windows where
needed. Longer windows increase over-attribution risk and should be shown as
less precise.

## Reporting Metrics

Campaign activity reports include selected recipients, sent messages, delivered
messages, failed messages, skipped recipients, click count, unique clickers,
replies, opt-outs, estimated SMS credits, and actual SMS credits.

Booking uploads, attribution classes, attributed revenue, revenue by confidence,
and return on spend belong to the later booking reconciliation plan.

Reports must label inferred attribution clearly. Do not imply click tracking
proves a booking happened.
