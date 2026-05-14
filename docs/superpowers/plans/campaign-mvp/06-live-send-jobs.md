# Phase 6: Tracking Links And Live Send Jobs

## Goal

Create per-recipient tracking links and send approved campaigns through Inngest
background jobs. HTTP routes enqueue the send only. The job performs provider
sends and records message state.

## Product Model

Live sends are irreversible operational actions. Sending must be deliberate,
audited, idempotent, and safe under retries.

Before each recipient is sent, Retaino must re-check suppression because a
contact may opt out after approval but before send.

Every live campaign SMS should use a per-recipient tracking link. Do not send
direct booking URLs in live campaign messages unless tracking links are
explicitly disabled in a later product decision.

## Backend Shape

### Database

Extend campaign schema with `campaign_messages`:

- `id`
- `organizationId`
- `campaignId`
- `recipientId`
- `provider`
- `providerMessageId`
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

Add `TRACKING_BASE_URL` to environment configuration. Rendered SMS links should
use this base URL plus `/r/:code`. The base URL must be public and must route to
the redirect handler introduced in phase 7.

Add these `campaigns` fields when live sending is introduced:

- `sendStartedAt`
- `sentAt`
- `failedAt`
- `failureReason`

Indexes:

- messages by organization and campaign
- unique provider plus provider message ID when present
- unique campaign recipient message, unless multiple messages per recipient are
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

Job rules:

1. Validate required identifiers.
2. Load campaign by `organizationId` and campaign ID.
3. Require status `approved` or `sending`.
4. Re-check campaign send eligibility, including setup, current legal
   acceptance, and sending configuration.
5. Check the organization's Retaino SMS credit balance and require enough
   credits for the estimated full campaign.
6. Prevent starting this send if another campaign for the same organization is
   already `sending`.
7. Mark campaign `sending`.
8. Load selected recipients by `organizationId` and campaign ID.
9. Create or reuse one tracking link per recipient.
10. Render the SMS body by appending the recipient tracking link and required
   opt-out text.
11. For each recipient, re-check phone suppression.
12. Create or reuse the message row before provider send.
13. Send through the SMS provider adapter.
14. Store the provider message ID, initial normalized status, and actual segment
   count from the provider response immediately when Twilio returns it.
15. Mark skipped recipients with an exclusion reason.
16. Record actual SMS segment usage as a Retaino credit transaction.
17. Write a send audit event.
18. Mark the campaign `sent` after all selected recipients have been attempted.

Idempotency rule:

- if a recipient already has a provider message ID, do not send that recipient
  again on job retry

Billing rule:

- check credits once for the whole campaign before sending
- do not check credits per recipient
- do not start a second live send while one campaign for the organization is
  already `sending`

### API

Add:

- `POST /v1/campaigns/:id/send`

The route only validates permission and enqueues the job. It returns `202`.

Mount the campaign Inngest function in `apps/api/src/server.ts` alongside the
existing contact import function.

### Web

Add live-send controls only for approved campaigns:

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
- send route rejects non-admin users
- job rejects missing identifiers
- job loads campaigns by organization and campaign ID
- job re-checks setup and legal eligibility before sending
- job blocks when Retaino SMS credit balance is lower than the estimated full
  campaign
- job blocks when another campaign for the same organization is already sending
- job creates or reuses one tracking link per recipient
- rendered SMS body includes the recipient tracking link and opt-out text
- rendered tracking links use `TRACKING_BASE_URL`
- retry does not duplicate provider sends
- recipients suppressed after approval are skipped
- initial provider response is stored before waiting for callbacks
- estimated and actual segment counts are stored separately
- actual sent segment usage is recorded as a Retaino credit transaction
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
- Sending after a legal update becomes required between approval and the send
  job.
- Presenting an enqueued background send as completed before the job finishes.
- Checking credits per SMS and creating confusing half-sent campaigns when credits
  run out mid-job.
