# Phase 5: Launch Snapshot

## Goal

Add the internal launch snapshot that freezes campaign configuration and
selected recipients behind the final send action. Reports must be able to
explain exactly who was selected and why.

This phase does not send live SMS.

## Product Model

Launch is the boundary between editable planning and operational execution.
The user-facing action is `Send campaign`.

When a campaign is launched:

- campaign fields cannot be changed
- selected recipients are stored as snapshots
- the launch decision is audit logged
- the campaign can later be sent by a background job

The internal pre-send campaign status is `ready_to_send`.

## Backend Shape

### Database

Extend `packages/db/src/schema/campaigns.ts` with:

Additional `campaigns` fields:

- `readyToSendAt`
- `readyToSendByUserId`

`campaign_recipients`

- `id`
- `organizationId`
- `campaignId`
- `contactId`
- `status`
- `exclusionReason`
- snapshot fields: name, phone, email, normalized phone, normalized email,
  phone hash, email hash, last booking date, last contacted date
- selected, queued, sent, and failed timestamps
- created and updated timestamps

`audit_logs`

- `id`
- `organizationId`
- `actorUserId`
- `eventType`
- `resourceType`
- `resourceId`
- `metadata`
- `ipAddress`
- `userAgent`
- `createdAt`

Indexes:

- recipients by organization and campaign
- recipients by organization and status
- audit logs by organization and created date
- audit logs by resource

Generate the migration from schema changes.

### Query And Service Layer

Add:

- `launchCampaign`
- `listCampaignRecipients`
- `createAuditLog`

Launch snapshot service responsibilities:

1. Load campaign by `organizationId` and campaign ID.
2. Reject missing campaigns.
3. Reject non-draft campaigns.
4. Re-run the same audience logic used by preview.
5. Reject empty audiences.
6. Insert recipient snapshots.
7. Mark campaign internally ready for send.
8. Write an audit log with audience rule, campaign code or reference, and
   recipient count.

### API

Add:

- `POST /v1/campaigns/:id/launch`
- `GET /v1/campaigns/:id/recipients`

Launch requires admin campaign eligibility. Recipient listing can be read by
members with organization access.

### Web

Extend the campaign builder with launch readiness state:

- show read-only campaign details before launch
- show current audience count and estimated SMS segments
- require an explicit `Send campaign` action from an admin
- after launch snapshot, disable editing and show recipient snapshot status

Do not add live send controls in this phase.
The next phase wires the same user action to live send execution. If this phase
is implemented separately, prefer keeping launch snapshot internal until live
sending is ready.

## Tests

Add or extend tests in:

- `packages/db/test/schema/campaigns.test.ts`
- `packages/db/test/queries/campaigns.test.ts`
- `apps/api/test/features/campaigns/campaigns.routes.test.ts`
- `apps/api/test/features/campaigns/campaigns.service.test.ts`

Minimum coverage:

- launching creates recipient snapshots
- snapshots copy contact fields instead of relying only on current contacts
- launching a non-draft campaign returns conflict
- launching an empty audience returns validation failure
- launch writes an audit event
- update and delete reject launched campaigns
- web UI disables editing after launch

## Verification

Run:

```bash
pnpm --filter @retaino/db test
pnpm --filter @retaino/db typecheck
pnpm --filter @retaino/api test -- campaigns
pnpm --filter @retaino/api typecheck
```

## Risks

- Reports becoming inaccurate if they read mutable contact fields instead of
  recipient snapshots.
- Launch snapshot and preview using different eligibility logic.
- Missing audit records for sensitive send preparation.
- Letting users edit SMS copy after recipients are launched.
- Adding a separate pre-send decision step instead of making launch the final
  action.
