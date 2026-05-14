# Phase 5: SMS Provider And Test Sends

## Goal

Add SMS preview and test-send support through a provider adapter. Twilio is the
MVP provider, but campaign services should depend on Retaino adapter types, not
Twilio SDK or webhook payload types.

This phase sends only test messages. It does not send approved campaigns.

## Product Model

Users need confidence before approval and live send:

- preview the final message including forced opt-out text
- see encoding and SMS segment count
- send a test SMS to a responsible user or explicit test phone

Every SMS must include required opt-out wording. The user cannot remove it.

## Backend Shape

### Shared Contracts

Extend `packages/shared/src/contracts/campaigns.ts` with:

- forced opt-out text constant
- SMS preview schema
- SMS encoding and segment-count helper
- test-send request and response schemas

The preview helper should return:

- rendered body
- character count
- segment count
- encoding: `gsm7` or `unicode`
- forced opt-out text

Rendering rule:

1. Start with the campaign SMS body.
2. Append the booking URL or test tracking URL.
3. Append the forced opt-out text.

Do not support user-authored template variables in MVP.

### Provider Adapter

Create `apps/api/src/lib/sms-provider.ts`.

Adapter interface:

- `send(input)`
- normalized result with provider, provider message ID, status, segment count,
  cost, and currency

Create `apps/api/src/lib/twilio-provider.ts` for Twilio-specific behavior.

Use Twilio's REST API directly in this phase. Do not install the Twilio Node SDK
unless a later compatibility spike proves it works cleanly in Cloudflare
Workers. If the SDK is added later, keep it behind the same adapter interface.

Production sends should use `TWILIO_MESSAGING_SERVICE_SID` when configured.
Support a direct `TWILIO_FROM_PHONE` fallback for local development and Twilio
test-credential mode. Twilio test credentials validate SMS request shape without
sending real messages, but they do not support `MessagingServiceSid` and do not
trigger status callbacks.

Centralize sending mode in the provider factory. Routes, campaign services, and
jobs should call the adapter and should not branch on sending mode themselves.
Supported modes:

- `disabled`: block sends with a clear configuration error
- `test`: call Twilio test credentials and magic numbers
- `live`: call live Twilio credentials

Declare any new dependency in `apps/api/package.json`. The direct REST approach
should not require a Twilio dependency.

### API

Add:

- `POST /v1/campaigns/:id/sms-preview`
- `POST /v1/campaigns/:id/test-send`

Test sends require admin campaign eligibility. They should audit the action but
must not create campaign recipients. The request may include an explicit test
phone. If it does not, use the organization's responsible phone when present.

### Web

Add test-send controls to the campaign review flow:

- show rendered SMS preview with estimated segment count
- allow an explicit test phone input
- default to the organization responsible phone when available
- show provider success or failure feedback
- keep live send unavailable in this phase

### Environment

Extend `apps/api/src/types.ts` with Twilio bindings:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID`
- `TWILIO_FROM_PHONE`
- `TWILIO_STATUS_CALLBACK_BASE_URL`
- `SMS_SENDING_MODE`

Add matching examples to `apps/api/.dev.vars.example`.

## Tests

Add or extend tests in:

- `packages/shared/test/contracts/campaigns.test.ts`
- `apps/api/test/lib/sms-provider.test.ts`
- `apps/api/test/features/campaigns/campaigns.routes.test.ts`
- `apps/api/test/features/campaigns/campaigns.service.test.ts`

Minimum coverage:

- opt-out text is always appended
- rendered preview includes the booking URL or test tracking URL
- unsupported template syntax is rejected before send
- GSM-7 and Unicode segment counts are stable
- test-send route requires admin
- provider result is normalized
- missing provider configuration fails clearly
- test sends do not create campaign recipients
- explicit test phone overrides organization responsible phone
- organization responsible phone is used when no explicit test phone is provided
- web UI shows rendered SMS preview before test send
- fake provider tests cover success, provider validation errors, temporary
  provider errors, and missing configuration
- optional Twilio test-credential checks use magic numbers and are excluded from
  normal CI unless credentials are explicitly configured

## Verification

Run:

```bash
pnpm --filter @retaino/shared test
pnpm --filter @retaino/api test -- campaigns
pnpm --filter @retaino/api test -- sms-provider
pnpm --filter @retaino/api typecheck
```

## Risks

- Allowing real sends from development or test environments by accident.
- Using Twilio types outside the adapter.
- Scattering sending-mode checks across routes, services, and jobs instead of
  centralizing them in the provider factory.
- Letting users remove opt-out text.
- Letting users accidentally omit the booking link by requiring placeholders.
- Segment estimates differing from provider billing.
- Treating Twilio test credentials as end-to-end coverage even though they do
  not emit callbacks or support Messaging Services.
- Hiding test-send provider failures behind generic UI errors.
