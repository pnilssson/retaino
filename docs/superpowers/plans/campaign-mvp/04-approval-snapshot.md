# Phase 4: Approval Snapshot

## Goal

Approve a draft campaign and snapshot its recipients. Approval freezes the
campaign configuration and selected recipients so later reports can explain
exactly who was selected and why.

This phase does not send live SMS.

## Product Model

Approval is the boundary between editable planning and operational execution.
After approval:

- campaign fields cannot be changed
- selected recipients are stored as snapshots
- approval is audit logged
- the campaign can later be sent by a background job

## Backend Shape

### Database

Extend `packages/db/src/schema/campaigns.ts` with:

Additional `campaigns` fields:

- `approvedAt`
- `approvedByUserId`

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

- `approveCampaign`
- `listCampaignRecipients`
- `createAuditLog`

Approval service responsibilities:

1. Load campaign by `organizationId` and campaign ID.
2. Reject missing campaigns.
3. Reject non-draft campaigns.
4. Re-run the same audience logic used by preview.
5. Reject empty audiences.
6. Insert recipient snapshots.
7. Mark campaign `approved`.
8. Write an audit log with audience rule, campaign code, and recipient count.

### API

Add:

- `POST /v1/campaigns/:id/approve`
- `GET /v1/campaigns/:id/recipients`

Approval requires admin campaign eligibility. Recipient listing can be read by
members with organization access.

### Web

Extend the campaign builder with a review and approve state:

- show read-only campaign details before approval
- show current audience count and estimated SMS segments
- require an explicit approval action from an admin
- after approval, disable draft editing and show recipient snapshot status

Do not add live send controls in this phase.

## Tests

Add or extend tests in:

- `packages/db/test/schema/campaigns.test.ts`
- `packages/db/test/queries/campaigns.test.ts`
- `apps/api/test/features/campaigns/campaigns.routes.test.ts`
- `apps/api/test/features/campaigns/campaigns.service.test.ts`

Minimum coverage:

- approving creates recipient snapshots
- snapshots copy contact fields instead of relying only on current contacts
- approving a non-draft campaign returns conflict
- approving an empty audience returns validation failure
- approval writes an audit event
- update and delete reject approved campaigns
- web UI disables editing after approval

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
- Approval and preview using different eligibility logic.
- Missing audit records for sensitive send preparation.
- Letting users edit SMS copy after recipients are approved.
- Adding send controls before test-send and live-send phases exist.
