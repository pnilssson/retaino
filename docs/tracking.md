# Tracking

Retaino v1 uses per-recipient short links plus CSV booking reconciliation. This
is the best practical no-integration setup because it gives reliable click
tracking and honest booking attribution without depending on booking-system
webhooks.

## Short links

Every SMS contains a unique short link for one campaign recipient.

Example:

```text
https://yourdomain.com/r/a8x91
```

The short link record must store:

- campaign ID
- recipient ID
- organization ID, following `docs/tenancy.md`
- phone hash
- email hash
- target booking URL
- sent time
- first click time
- last click time
- click count
- created_at and updated_at

Do not store the short code as the attribution source by itself. The short code
is only a lookup key. Attribution should resolve through campaign and recipient
IDs.

## Core entities

Minimum data model for the MVP:

| Entity | Purpose |
| --- | --- |
| Organization | Tenant boundary for users, imports, campaigns, links, bookings, billing, and logs. See `docs/tenancy.md`. |
| Contact | Normalized recipient profile imported by the customer. |
| Suppression | Phone or email that must not receive future campaigns for an organization. |
| Import | Customer CSV upload, mapping, validation result, and dedupe summary. |
| Campaign | Offer, audience, target URL, attribution window, SMS copy, code, status, and spend. |
| CampaignRecipient | Snapshot of one contact inside one campaign, including sent state and hashes. |
| MessageEvent | Provider events such as queued, sent, delivered, failed, and reply. |
| TrackingLink | Unique short link for one campaign recipient. |
| ClickEvent | Timestamped click on a tracking link. |
| BookingImport | Booking CSV upload, mapping, validation result, and reconciliation status. |
| Booking | Normalized booking row from an upload or future integration. |
| AttributionMatch | Match between booking, campaign, and recipient with class, confidence, and reason. |
| AuditLog | Tenant-scoped record of sensitive changes and approvals. |

Suggested campaign statuses:

- draft
- test_ready
- scheduled
- sending
- sent
- reconciling
- reported
- canceled

Suggested import statuses:

- uploaded
- mapped
- validating
- failed
- ready
- processing
- processed

## Redirect flow

1. Recipient opens `/r/:code`.
2. API looks up the link by short code.
3. API records click event with timestamp, user agent, IP-derived coarse metadata
   if allowed, and organization ID.
4. API redirects to the stored booking URL.
5. If the campaign has UTM settings, append them to the booking URL.

The redirect must stay fast. Any enrichment or analytics aggregation should run
outside the HTTP request.

## Booking CSV reconciliation

After a campaign, the business exports bookings from systems such as
Bokadirekt, Fresha, BookSalon, Timma, BokaMera, or similar tools. They upload
the export into Retaino.

Retaino maps booking export fields such as:

- booking ID when available
- customer name
- phone
- email
- service name
- booking date
- booking created_at
- price or revenue
- staff or location when available
- campaign code or offer code when available

Reconciliation should run as a background job. The upload UI should show mapping
status, validation errors, matched rows, and unmatched rows.

## Matching inputs

Use these fields to match bookings against campaign recipients:

- normalized phone number
- normalized email
- phone hash
- email hash
- name plus phone suffix
- booking date
- service name
- booking created_at after sent time or click time
- campaign code or offer code

Never match across organizations. Internal organization ID is required in every
query.

## Attribution classes

Each booking must be classified into exactly one attribution class:

| Class | Meaning |
| --- | --- |
| Direct match | Same phone or email as a campaign recipient, booked within the attribution window. |
| Click-assisted match | Recipient clicked and a matching booking appeared within the attribution window. |
| Campaign-window match | Recipient received SMS and booked within the attribution window, even without a click. |
| Unmatched | Cannot attribute to the campaign with enough confidence. |

If multiple campaigns could match, prefer the most recent campaign whose sent or
click event is inside the attribution window. Keep enough metadata to explain
why the match was chosen.

## Confidence scoring

Store a confidence level and match reason for each attributed booking.

High confidence:

- same phone or email
- booking is inside the attribution window
- recipient clicked the link or used campaign code

Medium confidence:

- same phone or email
- booking is inside the attribution window
- no click and no campaign code

Low confidence:

- customer says it came from campaign
- code was manually reported
- no clean customer match exists

Low-confidence attribution must be visibly separated in reports.

## Attribution windows

Use configurable attribution windows:

| Window | Use case |
| --- | --- |
| 3 days | urgent offers |
| 7 days | default |
| 14 days | higher-value services |
| 30 days | expensive treatments or B2B-like purchases only |

Campaigns should default to 7 days. Longer windows increase over-attribution
risk and should be shown as less precise.

## Matching order

Use this deterministic order for MVP:

1. Exact campaign code or offer code, if present.
2. Exact normalized phone match.
3. Exact normalized email match.
4. Name plus phone suffix match.
5. Click-assisted time match.
6. Campaign-window time match.

When several bookings match one recipient, keep all valid booking matches but
avoid counting the same booking twice. When several recipients match one
booking, choose the strongest confidence score, then closest click time, then
closest sent time.

## Reporting metrics

Campaign reports should include:

- recipients selected
- SMS segments sent
- estimated and actual SMS cost
- delivered count
- failed count
- click count
- unique clickers
- opt-outs
- uploaded bookings
- direct matches
- click-assisted matches
- campaign-window matches
- unmatched bookings
- attributed revenue
- revenue by confidence level
- return on spend

Reports must label inferred attribution clearly. The product should never imply
that click tracking proves a booking happened.

## Long-term path

After the CSV-based MVP, add booking-system integrations and webhooks so
bookings and revenue can be matched automatically. The first integration should
be chosen by market access and customer demand, with Bokadirekt as the likely
first Swedish target.
