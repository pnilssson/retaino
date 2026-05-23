# Tracking

Retaino v1 uses per-recipient short links to measure campaign activity.
Tracking records recipient clicks only. It does not own booking reports or
campaign outcome reporting.

## Entities

Tenant-owned tracking entities:

| Entity | Purpose |
| --- | --- |
| TrackingLink | Unique short link for one campaign recipient. |
| ClickEvent | Timestamped click on a tracking link. |

All tenant-owned entities follow `docs/architecture.md`.

## Short Links

Every SMS contains a unique short link for one campaign recipient, for example
`https://go.retaino.com/r/0123456789abcdef`.

The short link record stores organization ID, campaign ID, recipient ID, target
booking URL, short code, and timestamps. Recipient hashes stay on the campaign
recipient snapshot and are not duplicated on tracking links.

The short code is only a lookup key. Later attribution can use campaign,
recipient, and click data without making tracking responsible for outcomes.

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
