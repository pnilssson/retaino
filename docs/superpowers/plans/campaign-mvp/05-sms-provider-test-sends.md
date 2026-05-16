# Phase 5: SMS Provider And Test Sends

## Goal

Add SMS preview, organization sender provisioning, and test-send support through
a provider adapter. Twilio is the MVP provider, but campaign services should
depend on Retaino adapter types, not Twilio SDK or webhook payload types.

This phase sends only test messages. It does not send approved campaigns.

## Product Model

Users need confidence before approval and live send:

- preview the final message including forced opt-out text
- see encoding and SMS segment count
- set up the organization's dedicated SMS sender only when sending becomes real
- choose the sender country and sender number for the recipient market
- send a test SMS to a responsible user or explicit test phone

Every SMS must include required opt-out wording. The user cannot remove it.
The rendered SMS must identify the customer organization clearly enough that a
recipient can understand who sent the marketing message.

## Backend Shape

### Database

Create an organization sender table, for example `organization_sms_senders`:

- `id`
- `organizationId`
- `provider`
- `status`: `pending`, `ready`, `failed`, `manual_action_required`
- `phoneNumber`
- `countryCode`
- `numberType`
- `providerMessagingServiceId`
- `providerPhoneNumberId`
- `regulatoryStatus`
- `failureReason`
- `provisionedAt`
- `lastVerifiedAt`
- created and updated timestamps

Rules:

- one active sender per organization in MVP
- admins choose the sender country and number before provisioning
- store provider resource IDs and sender state, not Twilio credentials
- enforce uniqueness by organization and provider
- provisioning retries must reuse the existing row and provider resources when
  possible

### Shared Contracts

Extend `packages/shared/src/contracts/campaigns.ts` with:

- forced opt-out text constant
- SMS preview schema
- SMS encoding and segment-count helper
- test-send request and response schemas
- sender provisioning status schema and response schema
- available sender country and number selection schemas

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
The preview helper must use the same SMS encoding policy as live sending. If
Twilio Smart Encoding is enabled in the Messaging Service, Retaino must mirror
those substitutions before estimating segments. Otherwise, keep provider-side
Smart Encoding disabled for MVP so estimates match the submitted body.

### Provider Adapter

Create `apps/api/src/lib/sms-provider.ts`.

Adapter interface:

- `ensureSender(input)`
- `send(input)`
- normalized result with provider, provider message ID, status, segment count,
  cost, and currency

Create `apps/api/src/lib/twilio-provider.ts` for Twilio-specific behavior.

Use Twilio's REST API directly in this phase. Do not install the Twilio Node SDK
unless a later compatibility spike proves it works cleanly in Cloudflare
Workers. If the SDK is added later, keep it behind the same adapter interface.

Production sends use the organization's stored Twilio Messaging Service SID.
Support a direct `TWILIO_FROM_PHONE` fallback only for local development and
Twilio test-credential mode. Twilio test credentials validate SMS request shape
without sending real messages, but they do not support `MessagingServiceSid`
and do not trigger status callbacks.

`ensureSender` should:

1. Require active billing and current legal acceptance.
2. Reuse an existing ready sender.
3. Require the admin-selected sender country and phone number.
4. Create or recover the organization's Twilio Messaging Service.
5. Provision the selected SMS-capable Twilio phone number.
6. Attach the number to the organization's Messaging Service.
7. Configure service-level inbound and status callback URLs.
8. Mark the sender ready only after the required provider IDs are stored.

Create and update Twilio sender resources through REST APIs first. If the
Twilio Node SDK is introduced later, it must stay behind the provider adapter.
If Twilio cannot configure a required Messaging Service setting reliably through
the API, mark the sender `manual_action_required` or `failed` with a clear
internal reason. Do not allow live sends from a partially configured sender.
`manual_action_required` means the organization admin must provide additional
regulatory information inside Retaino. It must not require Retaino staff to
manually configure each customer in Twilio.

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

- `GET /v1/organization/sms-sender/countries`
- `GET /v1/organization/sms-sender/numbers`
- `POST /v1/organization/sms-sender`
- `GET /v1/organization/sms-sender`
- `POST /v1/campaigns/:id/sms-preview`
- `POST /v1/campaigns/:id/test-send`

Sender provisioning requires admin campaign eligibility, active billing, and
current legal acceptance. The route accepts the selected sender country and
phone number, returns current sender status, and may enqueue or perform
idempotent provisioning. It must not create more than one active sender for the
organization.

The countries and number search endpoints expose only SMS-capable options that
Retaino can self-serve for MVP. If a selected country or number type needs more
regulatory information, the organization admin provides it in Retaino.

Test sends require admin campaign eligibility. They should audit the action but
must not create campaign recipients. The request may include an explicit test
phone. If it does not, use the organization's responsible phone when present.
Test sends require the same local Stripe-backed subscription projection and
Retaino SMS credit balance used by live sends. Check enough credits for the
estimated preview before sending, reserve those credits, then reconcile actual
segment usage as Retaino credit transactions after the provider response.
Test sends require a ready organization sender in live sending mode.

### Web

Add test-send controls to the campaign review flow:

- show sender setup status
- let admins choose sender country and number
- let admins provision the sender when it is missing or failed
- show rendered SMS preview with estimated segment count
- allow an explicit test phone input
- default to the organization responsible phone when available
- show provider success or failure feedback
- keep live send unavailable in this phase

### Environment

Extend `apps/api/src/types.ts` with Twilio bindings:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_PHONE` for local and test-credential mode only
- `TWILIO_INBOUND_CALLBACK_BASE_URL`
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
- rendered SMS identifies the customer organization
- rendered preview includes the booking URL or test tracking URL
- rendered preview and provider sends use the same SMS encoding policy
- unsupported template syntax is rejected before send
- GSM-7 and Unicode segment counts are stable
- sender provisioning requires admin, active billing, and current legal
  acceptance
- sender provisioning uses the admin-selected sender country and number
- sender country and number search only returns SMS-capable self-serve options
- sender provisioning stores provider resource IDs and never stores credentials
- sender provisioning is idempotent and does not create duplicate active senders
- manual action means organization-admin action in Retaino, not Retaino staff
  action in Twilio
- partially configured senders are not marked ready
- test-send route requires admin
- test-send route requires active billing and enough Retaino SMS credits
- test-send route requires a ready organization sender in live mode
- provider result is normalized
- missing provider configuration fails clearly
- test sends do not create campaign recipients
- test-send estimated credits are reserved before provider send
- actual test-send segment usage is reconciled as Retaino credit transactions
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
