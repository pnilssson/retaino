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
`https://go.retaino.com/r/a8x91`.

The short link record stores organization ID, campaign ID, recipient ID, phone
hash, email hash, target booking URL, sent time, first click time, last click
time, click count, and timestamps.

The short code is only a lookup key. Attribution resolves through campaign and
recipient IDs.

## Redirect Flow

1. Recipient opens `/r/:code`.
2. API looks up the link by short code.
3. API records a click event with timestamp, user agent, IP-derived coarse
   metadata if allowed, and organization ID.
4. API redirects to the stored booking URL.
5. UTM settings are appended when the campaign has them.

Redirects must stay fast. Enrichment and aggregation run outside the HTTP
request.

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

Campaign reports include recipients selected, segments sent, estimated and
actual SMS cost, delivered count, failed count, click count, unique clickers,
opt-outs, uploaded bookings, direct matches, click-assisted matches,
campaign-window matches, unmatched bookings, attributed revenue, revenue by
confidence, and return on spend.

Reports must label inferred attribution clearly. Do not imply click tracking
proves a booking happened.
