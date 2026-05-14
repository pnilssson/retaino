# Phase 7: Events, Tracking, Reporting

## Goal

Record provider events, handle STOP replies, resolve tracking links, record
clicks, and expose campaign reporting metrics.

This phase completes the basic campaign feedback loop, but booking CSV
reconciliation and revenue attribution remain a separate plan.

## Product Model

Campaign reports should be honest and operational:

- how many recipients were selected
- how many messages were sent, delivered, failed, and clicked
- how many opt-outs happened
- what the SMS cost estimate and actual provider data show

Reports must not imply that clicks prove bookings. Booking attribution comes
from the later reconciliation system.

## Backend Shape

### Database

Extend campaign schema with:

`campaign_message_events`

- `id`
- `organizationId`
- `campaignId`
- `messageId`
- `recipientId`
- `provider`
- `providerMessageId`
- `eventType`
- `rawStatus`
- `rawPayload`
- `occurredAt`
- `createdAt`

`click_events`

- `id`
- `organizationId`
- `campaignId`
- `recipientId`
- `trackingLinkId`
- `userAgent`
- `ipAddress` or coarse IP-derived metadata when allowed by policy
- `occurredAt`
- `createdAt`

Indexes:

- provider message lookup
- organization plus campaign
- clicks by organization and campaign

### Tracking Links

Tracking links are created before live sending in phase 6. This phase adds the
public redirect route and click recording.

Public redirect route:

- `GET /r/:code`

Redirect flow:

1. Look up by code.
2. Resolve organization from the tracking link record.
3. Record click event.
4. Update click counters.
5. Redirect to the target booking URL.

The redirect route must not require Clerk auth.
Add rate limiting for redirect requests before launch. Do not record more IP
data than the product and legal docs allow.

### Provider Callbacks

Add routes outside Clerk auth:

- `POST /v1/campaign-webhooks/twilio/status`
- `POST /v1/campaign-webhooks/twilio/inbound`

Rules:

- validate Twilio signatures before accepting callback data
- use Twilio's official signature validation behavior or library rather than a
  hand-rolled fixed-parameter check
- normalize provider statuses into Retaino event types
- write `campaign_message_events`
- update message and recipient status where appropriate
- detect STOP-style inbound replies
- write phone suppressions for STOP replies
- support `OptOutType` when present, but still detect STOP-style body text
  because the parameter depends on Messaging Service opt-out configuration

STOP suppression fields:

- `type = phone`
- `reason = provider_opt_out`
- `source = twilio`

### Reporting

Add:

- `GET /v1/campaigns/:id/report`

Initial metrics:

- selected recipients
- queued count
- sent count
- delivered count
- failed count
- opt-out count
- click count
- unique clickers
- estimated SMS segments
- actual SMS segments
- segment estimate drift
- estimated cost
- actual cost when available

### Web

Add a campaign report view:

- show delivery, failure, click, and opt-out metrics
- show estimated versus actual SMS segments and cost when available
- clearly label the report as campaign activity, not revenue attribution
- leave booking and revenue attribution empty or unavailable until the booking
  reconciliation plan is implemented

## Tests

Add or extend tests in:

- `packages/db/test/schema/campaigns.test.ts`
- `packages/db/test/queries/campaigns.test.ts`
- `apps/api/test/features/campaigns/campaigns.routes.test.ts`
- `apps/api/test/features/campaigns/campaigns.service.test.ts`

Minimum coverage:

- tracking codes are unique
- redirect resolves organization from the link record
- redirect records click events
- redirect route has a rate-limit strategy
- provider callbacks bypass Clerk but validate Twilio signatures
- signed webhook fixture tests cover evolving form parameters, not a hard-coded
  current parameter list
- STOP replies create suppressions
- reporting metrics are tenant-scoped
- reporting keeps estimated and actual segment counts separate
- no report query fetches by campaign ID alone
- web report does not imply bookings or revenue are known yet

## Verification

Run:

```bash
pnpm --filter @retaino/db test
pnpm --filter @retaino/db typecheck
pnpm --filter @retaino/api test -- campaigns
pnpm --filter @retaino/api typecheck
```

## Risks

- Accepting forged provider callbacks.
- Resolving tracking redirects from the URL instead of stored records.
- Recording clicks without tenant ownership.
- Over-collecting raw IP data for click events.
- Missing STOP variants that customers expect to suppress future sends.
- Reporting inferred outcomes as exact bookings or revenue.
- Depending on Twilio test credentials for callback coverage. Test credentials
  do not emit status callbacks, so callback behavior needs signed fixture tests
  and manual live smoke testing.
- Losing visibility into segment estimate drift by only storing provider actuals
  or only storing Retaino estimates.
- Showing revenue attribution before booking reconciliation exists.
