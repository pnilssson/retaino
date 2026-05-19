# Phase 6: Tracking Links And Live Send Jobs

## Goal

Create per-recipient tracking links and send launched campaigns through Inngest
background jobs. HTTP routes enqueue the send only. The job performs provider
sends and records message state.

## Product Model

Live sends are irreversible operational actions. Sending must be deliberate,
audited, idempotent, and safe under retries.

Before each recipient is sent, Retaino must re-check suppression because a
contact may opt out after launch but before send.

Every live campaign SMS should use a per-recipient tracking link. Do not send
direct booking URLs in live campaign messages unless tracking links are
explicitly disabled in a later product decision.

Live campaign senders must support the opt-out path shown in the SMS. Do not use
one-way alphanumeric sender IDs while reply-based STOP handling is the only
opt-out mechanism.
Live sends must use the organization's ready Messaging Service created in phase
5. Do not use a global sender for production campaign sends.

## Backend Shape

### Database

Create or reuse the canonical `sms_messages` ledger for outbound campaign
messages. Do not create a separate `campaign_messages` source of truth.
Outbound campaign messages use:

- `id`
- `organizationId`
- `direction`: `outbound`
- `campaignId`
- `recipientId`
- `contactId`
- `provider`
- `providerMessageId`
- `providerMessagingServiceId`
- `providerPhoneNumberId`
- `fromPhone`
- `toPhone`
- `body`
- `status`
- `estimatedSegmentCount`
- `actualSegmentCount`
- `estimatedCostMinor`
- `actualCostMinor`
- `currency`
- queued, sent, delivered, and failed timestamps
- created and updated timestamps

Phase 7 adds inbound rows to the same `sms_messages` ledger.

Add `tracking_links` before live sending:

- `id`
- `organizationId`
- `campaignId`
- `recipientId`
- `code`
- `targetUrl`
- `phoneHash`
- `emailHash`
- first and last clicked timestamps
- click count
- created and updated timestamps

Add `TRACKING_BASE_URL` to environment configuration with
`https://go.retaino.com` as the production value. Rendered SMS links should use
this base URL plus `/r/:code`. The base URL must be public and must route to the
redirect handler introduced in phase 7.

Add these `campaigns` fields when live sending is introduced:

- `sendStartedAt`
- `sentAt`
- `failedAt`
- `failureReason`
- `reservedCreditCount`
- `actualCreditCount`

Indexes:

- SMS messages by organization and campaign
- unique provider plus provider message ID when present
- unique campaign recipient SMS message, unless multiple messages per recipient are
  introduced in a later phase
- unique tracking code
- tracking links by organization and campaign

### Jobs

Create `apps/api/src/features/campaigns/campaigns.jobs.ts`.

Event:

- `campaigns/send.process`

Payload:

- `organizationId`
- `campaignId`
- `userId`

Use a deterministic Inngest event ID derived from organization and campaign
when enqueueing a live send. This reduces accidental duplicate runs, but the
database message rows, campaign status, and credit reservation remain the
authoritative idempotency controls.

Job rules:

1. Validate required identifiers.
2. Load campaign by `organizationId` and campaign ID.
3. Require an internally launched or sending campaign status.
4. Re-check campaign send eligibility, including setup, current legal
   acceptance, and sending configuration.
5. Require a ready organization sender and load its Messaging Service ID.
6. Require an active subscription in the local Stripe-backed billing projection.
7. Check the organization's Retaino SMS credit balance and require enough
   available credits for the estimated full campaign.
8. Reserve estimated credits from `organization_billing_profiles` and write
   matching SMS credit transaction audit rows.
9. Prevent starting this send if another campaign for the same organization is
   already `sending`.
10. Mark campaign `sending`.
11. Load selected recipients by `organizationId` and campaign ID.
12. Create or reuse one tracking link per recipient.
13. Render the SMS body by replacing supported personalization tokens, then
    appending the recipient tracking link and required opt-out text.
14. For each recipient, re-check phone suppression.
15. Create or reuse the message row before provider send.
16. Send through the SMS provider adapter using the organization's Messaging
   Service ID.
17. Store the provider message ID, provider sender IDs, initial normalized
   status, and actual segment
   count from the provider response immediately when Twilio returns it.
18. Mark skipped recipients with an exclusion reason.
19. Reconcile reserved and actual SMS segment usage through the billing profile
   balance and SMS credit transaction audit rows.
20. Write a send audit event.
21. Mark the campaign `sent` after all selected recipients have been attempted.

Idempotency rule:

- if a recipient already has an outbound `sms_messages` row with a provider
  message ID, do not send that recipient again on job retry

Billing rule:

- reserve estimated credits once for the whole campaign before sending
- reconcile actual usage after sending
- do not check credits per recipient
- do not start a second live send while one campaign for the organization is
  already `sending`
- active billing status gates spending; SMS credit transactions are the
  immutable source of truth for available balance and audit history

### API

Add:

- `POST /v1/campaigns/:id/send`

The user-facing action is `Send campaign`. Depending on where launch snapshot
is implemented, this route may either require an already launched campaign or
perform the launch snapshot before enqueueing. In either case, the HTTP request
must not perform long-running sends. It validates permission, locks the campaign
against further edits, and returns `202` after the send work is queued.

Mount the campaign Inngest function in `apps/api/src/server.ts` alongside the
existing contact import function.

### Web

Add live-send controls only when the campaign is ready to launch:

- show final recipient count
- show estimated SMS segments and estimated cost
- require an explicit send action from an admin
- show queued, sending, sent, failed, and skipped states
- refresh campaign status after enqueueing send

Do not block the UI while the background job runs.

## Tests

Add or extend tests in:

- `apps/api/test/features/campaigns/campaigns.jobs.test.ts`
- `apps/api/test/features/campaigns/campaigns.service.test.ts`
- `apps/api/test/features/campaigns/campaigns.routes.test.ts`
- `packages/db/test/queries/campaigns.test.ts`

Minimum coverage:

- send route enqueues the correct event
- send route uses a deterministic event ID for the organization and campaign
- send route rejects non-admin users
- job rejects missing identifiers
- job loads campaigns by organization and campaign ID
- job re-checks setup and legal eligibility before sending
- job requires a ready organization sender
- job requires active billing before sending
- job blocks when Retaino SMS credit balance is lower than the estimated full
  campaign
- job reserves estimated credits before provider sends
- job reserves and reconciles credits through billing helpers that append
  immutable SMS credit transaction rows
- outbound sends are recorded in the canonical `sms_messages` ledger
- job blocks when another campaign for the same organization is already sending
- job creates or reuses one tracking link per recipient
- rendered SMS body replaces `{first_name}` and `{last_booking_date}`
- rendered SMS body includes the recipient tracking link and opt-out text
- sender configuration supports the rendered opt-out path
- provider sends use the organization's Messaging Service ID
- rendered tracking links use `TRACKING_BASE_URL`
- retry does not duplicate provider sends
- recipients suppressed after launch are skipped
- initial provider response is stored before waiting for callbacks
- estimated and actual segment counts are stored separately
- actual sent segment usage is reconciled through SMS credit transaction rows
- send action is audit logged
- campaign is marked sent after attempts complete
- web UI shows background send state instead of pretending the send is instant

## Verification

Run:

```bash
pnpm --filter @retaino/db test
pnpm --filter @retaino/api test -- campaigns
pnpm --filter @retaino/api typecheck
```

## Risks

- Duplicate SMS under retries.
- Long-running sends inside HTTP requests.
- Skipping suppression re-checks before provider send.
- Partial sends leaving campaign status unclear.
- Provider failure handling that prevents later retry or support diagnosis.
- Assuming Twilio will send a callback for the initial message status. Store the
  initial API response because Twilio does not send that initial callback.
- Overwriting estimates with actual provider counts instead of preserving both
  values for cost drift reporting.
- Sending direct booking URLs before tracking links exist.
- Rendering tracking links with an internal API URL that recipients cannot open.
- Sending after a legal update becomes required between launch and the send
  job.
- Presenting an enqueued background send as completed before the job finishes.
- Checking credits per SMS and creating confusing half-sent campaigns when credits
  run out mid-job.
