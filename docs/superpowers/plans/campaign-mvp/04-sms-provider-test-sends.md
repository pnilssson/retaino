# Phase 4: SMS Provider And Test Sends

## Goal

Add SMS preview, organization sender provisioning, and test-send support through
a provider adapter. Twilio is the MVP provider, but campaign services should
depend on Retaino adapter types, not Twilio SDK or webhook payload types.

Phase 4 added only test messages. Live campaign sending is implemented in
Phase 6 and uses the same provider adapter.

Current implementation status:

- organization sender provisioning foundation exists behind `/v1/sms`
- campaign SMS preview exists at `/v1/campaigns/:id/sms/preview`
- test SMS sending exists at `/v1/campaigns/:id/sms/send`
- campaign builder includes a sender setup step before review
- review includes a test phone input and `Send test SMS`
- live campaign sends are handled by `POST /v1/campaigns/:id/send` and the
  Inngest job from Phase 6

## Product Model

Users need confidence before launching a campaign:

- preview the final message including forced opt-out text
- see the estimated SMS per recipient in plain product language
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
- test-send request and response schemas
- sender provisioning status schema and response schema
- available sender country and number selection schemas

Reuse the existing shared SMS preview and estimate helper from
`packages/shared/src/sms.ts`. Do not create a separate segment estimator in the
API or web app. The helper must remain the single estimate source for the web
composer, provider preview route, credit reservation, and test-send flow.
Use `createCampaignSmsPreview` for sample web previews, `renderCampaignSms` for
test sends and provider sends with exact recipient values, and
`estimateSmsMessage` when a route or service needs provider-ready estimate
metadata without rendering a campaign body.

The preview helper should return:

- rendered body
- character count
- estimated SMS per recipient
- forced opt-out text

Rendering rule:

1. Start with the campaign SMS body.
2. Replace supported personalization tokens.
3. Append the booking URL or test tracking URL.
4. Append the forced opt-out text.

Support only `{first_name}` and `{last_booking_date}` in MVP. Unknown
`{...}` tokens and system-owned tokens such as `{link}`, `{unsubscribe}`, and
`{opt_out}` must be rejected before preview or send. If a recipient is missing a
token value, render a clean empty fallback and avoid awkward doubled spaces or
punctuation where practical.
The preview helper must detect standard SMS character set limits and Unicode
fallback internally so emoji and other non-standard characters are estimated
correctly. Do not expose encoding names in user-facing UI. If Twilio Smart
Encoding is enabled in the Messaging Service, Retaino must mirror those
substitutions before estimating SMS usage. Otherwise, keep provider-side Smart
Encoding disabled for MVP so estimates match the submitted body.

### Provider Adapter

Create `apps/api/src/lib/sms-provider.ts`.

The adapter interface models Retaino SMS operations, not the chosen provider's
API objects. Research across Twilio, Vonage, Sinch, Bird, MessageBird, and
Telnyx shows the common provider responsibilities are:

- search or expose SMS-capable sender options by country and number type
- configure a sender group or profile with inbound and status webhook URLs
- verify whether a phone number supports outbound SMS, inbound SMS, and status
  callbacks
- report regulatory or manual action requirements before a sender can be used
- send an outbound SMS with a stable Retaino reference
- return provider message IDs, initial provider status, segment counts, and
  cost when available
- receive delivery reports or status callbacks and normalize them
- receive inbound messages and normalize them
- verify webhook signatures or signing keys when the provider supports it
- normalize provider errors without leaking provider payload shapes into product
  services

Define provider-neutral types in `apps/api/src/lib/sms-provider.ts`:

- `SmsProviderName`: starts with `fake` and `twilio`
- `SmsSenderCountry`: country code, label, supported number types, and whether
  Retaino can self-serve the country in MVP
- `SmsSenderOption`: E.164 phone number, country code, number type,
  capabilities, regulatory requirement summary, and user-facing label. Do not
  expose provider resource identifiers in browser-facing sender options.
- `SmsSenderCapability`: `outboundSms`, `inboundSms`, `statusCallbacks`,
  `twoWaySms`, and optional `smartEncoding`
- `SmsSenderProvisioningInput`: organization ID, selected sender option,
  inbound callback URL, status callback URL, idempotency key, and actor user ID
- `SmsSenderProvisioningResult`: normalized sender status, stored phone number,
  provider resource identifiers, capabilities, regulatory status, and failure
  reason
- `OutboundSmsInput`: Retaino message ID, organization sender, recipient E.164
  number, rendered body, estimated segments, callback URLs when needed, and a
  Retaino idempotency/reference value
- `OutboundSmsResult`: provider name, provider message ID, normalized status,
  provider status, provider sender references, actual segment count when known,
  cost when known, currency, and raw provider reference for support
- `SmsStatusEvent`: provider message ID, Retaino message reference when present,
  normalized status, provider status, timestamps, segment count, cost, currency,
  and provider error details when present
- `InboundSmsMessage`: provider message ID, from phone, to phone, body,
  received timestamp, provider sender reference, and raw provider reference
- `SmsProviderError`: normalized error code, retryability, public-safe message,
  internal provider message, and provider error code

Recommended adapter methods:

- `listSenderCountries(input)`
- `searchSenderOptions(input)`
- `ensureSender(input)`
- `sendSms(input)`
- `parseStatusWebhook(input)`
- `parseInboundWebhook(input)`
- `verifyWebhook(input)`

Normalized outbound statuses should start with: `queued`, `accepted`, `sent`,
`delivered`, `failed`, `undelivered`, and `skipped`. Provider-specific states
such as Bird `processing`, MessageBird `buffered`, Twilio `accepted`, or Sinch
batch delivery states must map to Retaino statuses before reaching services or
the database.

Normalized provider error codes should include at least:

- `configuration_missing`
- `sender_not_ready`
- `manual_action_required`
- `regulatory_blocked`
- `recipient_invalid`
- `message_invalid`
- `provider_rate_limited`
- `provider_temporary_failure`
- `provider_permanent_failure`
- `provider_unavailable`

Routes, services, jobs, and web UI must depend on these Retaino types only.
They must not inspect Twilio SIDs, Telnyx profile IDs, Vonage webhook payloads,
Sinch batch IDs, Bird channel IDs, or MessageBird status strings directly.

Create `apps/api/src/lib/twilio-provider.ts` for Twilio-specific behavior.

Use Twilio's REST API directly in this phase. Do not install the Twilio Node SDK
unless a later compatibility spike proves it works cleanly in Cloudflare
Workers. If the SDK is added later, keep it behind the same adapter interface.

Production sends use the organization's stored Twilio Messaging Service SID.
Support a direct `TWILIO_FROM_PHONE` fallback only for optional Twilio
test-credential request-shape checks. Normal local development and automated
tests use the Retaino fake provider. Twilio test credentials validate SMS
request shape without sending real messages, but they do not support
`MessagingServiceSid` and do not trigger status callbacks.

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
Supported runtime modes:

- `disabled`: block sends with a clear configuration error
- `test`: use a deterministic Retaino fake provider that never calls Twilio or
  another external provider
- `live`: call the configured live provider adapter

Declare any new dependency in `apps/api/package.json`. The direct REST approach
should not require a Twilio dependency.

The fake provider should implement the same interface as the live adapter. It
should return deterministic sender options, sender readiness, message IDs,
delivery states, segment counts, costs, temporary failures, permanent failures,
and inbound replies for tests. Product code must not know it is using a fake
provider.

### API

Add:

- `GET /v1/sms/countries`
- `GET /v1/sms/numbers`
- `POST /v1/sms`
- `GET /v1/sms`
- `POST /v1/campaigns/:id/sms/preview`
- `POST /v1/campaigns/:id/sms/send`

Sender provisioning requires admin campaign eligibility, active billing, and
current legal acceptance. The route accepts the selected sender country and
phone number, returns current sender status, and may enqueue or perform
idempotent provisioning. It must not create more than one active sender for the
organization.

The countries and number search endpoints expose only SMS-capable options that
Retaino can self-serve for MVP. If a selected country or number type needs more
regulatory information, the organization admin provides it in Retaino.

Test sends require admin campaign eligibility. They must not create campaign
recipients. The request may include an explicit test phone. If it does not, use
the organization's responsible phone when present. Test sends require the same
local Stripe-backed subscription projection and Retaino SMS credit balance used
by live sends. Reserve enough credits from `organization_billing_profiles`
before calling the provider, write matching SMS credit transaction audit rows,
and release the reserved credits if provider sending fails. Test sends require
a ready organization sender.
Use the shared SMS credit ledger model for test sends: reserve with
`transactionType: "debit"` and `source: "campaign_test_send"`, then release
failed reservations with `transactionType: "adjustment"` and the same source.
Test sends do not lock the campaign. The user can edit audience, message, or
booking details after a test and send another test before launching.

### Web

Extend the campaign builder with sender setup and review/test controls:

- show sender setup status
- let admins choose sender country and number
- let admins provision the sender when it is missing or failed
- show rendered SMS preview with estimated SMS per recipient
- allow an explicit test phone input
- default to the organization responsible phone when available
- show provider success or failure feedback
- keep live send unavailable in this phase

User-facing copy should say `Send test SMS`. Test sending is a
readiness step before the final launch action.

### Environment

Extend `apps/api/src/types.ts` with Twilio bindings:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_FROM_PHONE` for optional Twilio test-credential request-shape checks
  only
- `TWILIO_INBOUND_CALLBACK_BASE_URL`
- `TWILIO_STATUS_CALLBACK_BASE_URL`
- `SMS_SENDING_MODE`

Production should authenticate Twilio REST calls with `TWILIO_API_KEY_SID` and
`TWILIO_API_KEY_SECRET` where possible. Keep `TWILIO_AUTH_TOKEN` available for
local test credentials and Twilio webhook signature validation.

Add matching examples to `apps/api/.dev.vars.example`.

## Tests

Add or extend tests in:

- `packages/shared/test/contracts/campaigns.test.ts`
- `apps/api/test/lib/sms-provider.test.ts`
- `apps/api/test/features/sms/sms.routes.test.ts`
- `apps/api/test/features/campaigns/campaigns.routes.test.ts`
- `apps/api/test/features/campaigns/campaigns.service.test.ts`

Minimum coverage:

- opt-out text is always appended
- rendered SMS identifies the customer organization
- rendered preview includes the booking URL or test tracking URL
- rendered preview and provider sends use the same SMS encoding policy
- unsupported personalization syntax is rejected before send
- standard SMS character set and emoji estimates are stable
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
- provider adapter exposes sender capabilities without provider-specific types
- provider status webhooks normalize provider states to Retaino states
- provider inbound webhooks normalize incoming SMS messages to Retaino messages
- webhook verification is provider-owned and hidden behind the adapter
- provider errors normalize to Retaino error codes and retryability
- fake provider implements the same adapter interface as live providers
- fake provider test mode never calls external SMS APIs
- missing provider configuration fails clearly
- test sends do not create campaign recipients
- test-send estimated credits are reserved before provider send
- test-send reservations append immutable SMS credit transaction rows before
  provider send
- provider send failure releases the same reserved credit buckets
- explicit test phone overrides organization responsible phone
- organization responsible phone is used when no explicit test phone is provided
- web UI shows rendered SMS preview and estimated SMS per recipient before test
  send
- fake provider tests cover success, provider validation errors, temporary
  provider errors, and missing configuration
- optional Twilio test-credential checks use magic numbers and are excluded from
  normal CI unless credentials are explicitly configured

## Verification

Run:

```bash
pnpm --filter @retaino/shared test
pnpm --filter @retaino/db test
pnpm --filter @retaino/api test -- sms.routes
pnpm --filter @retaino/api test -- campaigns
pnpm --filter @retaino/api test -- sms-provider
pnpm --filter @retaino/api typecheck
pnpm --filter @retaino/web typecheck
pnpm --filter @retaino/web lint
pnpm --filter @retaino/web ui:audit
pnpm --filter @retaino/web contrast:check
```

## Risks

- Allowing real sends from development or test environments by accident.
- Designing the adapter around Twilio's Messaging Service shape instead of
  Retaino's SMS domain.
- Using Twilio, Vonage, Sinch, Bird, MessageBird, Telnyx, or other provider
  types outside the adapter.
- Scattering sending-mode checks across routes, services, and jobs instead of
  centralizing them in the provider factory.
- Letting product services inspect provider-specific delivery states or webhook
  payloads directly.
- Letting users remove opt-out text.
- Letting users accidentally omit the booking link by requiring placeholders.
- SMS estimates differing from provider billing because the API, web composer,
  and provider adapter use different logic.
- Treating Twilio test credentials as end-to-end coverage even though they do
  not emit callbacks or support Messaging Services.
- Building local test flows against Twilio test credentials instead of the
  deterministic fake provider.
- Hiding test-send provider failures behind generic UI errors.
