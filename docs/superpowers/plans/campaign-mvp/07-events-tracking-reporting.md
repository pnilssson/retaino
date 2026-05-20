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
- how many non-STOP replies came back
- how many opt-outs happened
- what the SMS cost estimate and actual provider data show

Reports must not imply that clicks prove bookings. Booking attribution comes
from the later reconciliation system.
This phase stores inbound replies needed for a future Retaino inbox, but it
does not add manual reply sending, assignments, notifications, or inbox views.

## Backend Shape

### Database

Extend messaging and reporting schema with:

Extend the canonical `sms_messages` ledger created in phase 6 with inbound
message support:

- `id`
- `organizationId`
- `direction`: `inbound` or `outbound`
- `provider`
- `providerMessageId`
- `providerMessagingServiceId`
- `providerPhoneNumberId`
- `fromPhone`
- `toPhone`
- `body`
- `status`
- `campaignId`
- `recipientId`
- `contactId`
- `receivedAt`
- `sentAt`
- created and updated timestamps

Use this as the durable message ledger for future inbox work. Do not create a
separate campaign-only message table as a second source of truth.

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
- `occurredAt`
- `createdAt`

Indexes:

- provider message lookup
- organization plus campaign
- clicks by organization and campaign
- inbound messages by organization and received date
- inbound messages by organization plus contact or recipient
- unique provider message ID

### Tracking Links

Tracking links are created before live sending in phase 6. This phase adds the
public redirect route and click recording.

Public redirect route:

- `GET /r/:code`

Production tracking URLs use `https://go.retaino.com/r/:code`.

Redirect flow:

1. Look up by code.
2. Resolve organization from the tracking link record.
3. Record click event.
4. Update click counters.
5. Redirect to the target booking URL.

The redirect route must not require Clerk auth.
Add Cloudflare Worker rate limiting for redirect requests before launch. Use a
route-level limiter before the tracking-code lookup plus a tracking-code limiter
for repeated requests to a known code. Click events store user agent plus the
tenant, campaign, recipient, and tracking link IDs needed for reporting.

### Provider Callbacks

Add routes outside Clerk auth:

- `POST /v1/webhooks/twilio/messaging/status`
- `POST /v1/webhooks/twilio/messaging/inbound`

Rules:

- validate Twilio signatures before accepting callback data
- use Twilio's official signature validation behavior or library rather than a
  hand-rolled fixed-parameter check
- normalize provider statuses into Retaino event types
- write `campaign_message_events`
- update `sms_messages` delivery status from provider callbacks
- store every inbound message in `sms_messages`
- detect STOP-style inbound replies, including Twilio's standard opt-out
  keywords such as STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, REVOKE, and
  OPTOUT
- write phone suppressions for STOP replies
- associate inbound messages to the organization sender by provider service,
  provider phone number reference when available, or destination phone number
- associate inbound messages to the most recent relevant campaign recipient
  when possible, but keep the message even when campaign matching is uncertain
- support `OptOutType` when present, but only treat `STOP` as an opt-out.
  `START` and `HELP` should be stored as replies without creating suppressions.
  Still detect STOP-style body text because the parameter depends on Messaging
  Service opt-out configuration.

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
- inbound reply count
- click count
- unique clickers
- estimated SMS segments
- actual SMS segments
- segment estimate drift
- estimated cost
- actual cost when available

Delivery metrics use `sms_messages` as the source of truth for provider status.
`campaign_recipients.status` represents the send-attempt workflow, such as
selected, sent, failed, or skipped, and should not duplicate every later
provider callback state.

### Web

Add a campaign report view:

- show delivery, failure, click, and opt-out metrics
- show inbound reply counts, but do not build the full inbox in this phase
- show estimated versus actual SMS segments and cost when available
- clearly label the report as campaign activity, not revenue attribution
- leave booking and revenue attribution empty or unavailable until the booking
  reconciliation plan is implemented

## Tests

Add or extend tests in:

- `packages/shared/test/contracts/campaigns.test.ts`
- `packages/db/test/schema/campaign-message-events.test.ts`
- `packages/db/test/schema/click-events.test.ts`
- `packages/db/test/schema/campaigns.test.ts`
- `packages/db/test/queries/campaigns.test.ts`
- `apps/api/test/features/campaigns/campaigns.routes.test.ts`
- `apps/api/test/features/campaigns/campaigns.service.test.ts`
- `apps/api/test/features/tracking/tracking.routes.test.ts`
- `apps/api/test/features/sms/sms.webhook-routes.test.ts`

Minimum coverage:

- tracking codes are unique
- redirect resolves organization from the link record
- redirect records click events
- redirect route has a rate-limit strategy
- provider callbacks bypass Clerk but validate Twilio signatures
- signed webhook fixture tests cover evolving form parameters, not a hard-coded
  current parameter list
- STOP replies create suppressions
- START and HELP provider opt-out events do not create suppressions
- non-STOP inbound replies are stored and tenant-scoped
- inbound replies are preserved even when campaign matching is uncertain
- reporting metrics are tenant-scoped
- report includes inbound reply count
- reporting keeps estimated and actual segment counts separate
- no report query fetches by campaign ID alone
- web report does not imply bookings or revenue are known yet

## Verification

Run:

```bash
pnpm --filter @retaino/db test
pnpm --filter @retaino/db typecheck
pnpm --filter @retaino/shared test
pnpm --filter @retaino/shared typecheck
pnpm --filter @retaino/api test -- campaigns
pnpm --filter @retaino/api test -- tracking.routes.test.ts sms.webhook-routes.test.ts
pnpm --filter @retaino/api typecheck
pnpm --filter @retaino/web typecheck
```

## Risks

- Accepting forged provider callbacks.
- Resolving tracking redirects from the URL instead of stored records.
- Recording clicks without tenant ownership.
- Expanding click-event data beyond the current reporting need.
- Missing STOP variants that customers expect to suppress future sends.
- Dropping non-STOP replies and making the future inbox require backfilling from
  provider logs.
- Making inbound reply routing depend only on the most recent campaign when the
  destination sender number already identifies the organization.
- Reporting inferred outcomes as exact bookings or revenue.
- Depending on Twilio test credentials for callback coverage. Test credentials
  do not emit status callbacks, so callback behavior needs signed fixture tests
  and manual live smoke testing.
- Losing visibility into segment estimate drift by only storing provider actuals
  or only storing Retaino estimates.
- Showing revenue attribution before booking reconciliation exists.
