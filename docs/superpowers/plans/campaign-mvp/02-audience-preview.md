# Phase 2: Audience Preview

## Goal

Let users preview how many contacts match a campaign audience before approval.
The preview should count eligible lapsed contacts and explain why other contacts
are excluded.

This phase still does not create recipient snapshots or send messages.

## Product Model

Audience selection belongs inside the campaign. MVP audience rules are simple:

- no booking in at least X days
- optionally include contacts without a booking date
- always require SMS readiness

Default rule: 90 lapsed days and `includeNoBookingDate = false`. Contacts
without a booking date can be included only when the user explicitly opts in.

SMS readiness means:

- normalized phone exists
- consent is granted
- phone is not suppressed

## Backend Shape

### Shared Contracts

Extend `packages/shared/src/contracts/campaigns.ts` with:

- `campaignAudiencePreviewRequestSchema`
- `campaignAudiencePreviewResponseSchema`
- `CampaignAudiencePreviewResponse`

Response shape:

- `eligibleCount`
- `suppressedCount`
- `incompleteCount`
- `missingConsentCount`
- `sampleContacts`

Sample contacts should be small, for example 10 rows, and include only fields
needed for preview:

- `id`
- `name`
- `phone`
- `lastBookingAt`

### Query Layer

Extend `packages/db/src/queries/campaigns.ts`.

Required functions:

- `campaignAudienceWhere`
- `previewCampaignAudience`

Use `campaignAudienceWhere` again during approval and as the basis for pre-send
suppression checks. Preview, approval, and send must not each invent their own
eligibility logic.

Rules:

- require `organizationId`
- filter contacts by `organizationId`
- exclude suppressed phone hashes with a subquery against `suppressions`
- treat `includeNoBookingDate` explicitly
- avoid loading all contacts into memory for counts
- do not cache preview results in backend or Worker memory

### API

Add:

- `POST /v1/campaigns/audience-preview`
- `GET /v1/campaigns/:id/audience-preview`

The direct POST endpoint lets the frontend preview unsaved draft changes. The
campaign ID endpoint previews the currently saved draft.

Preview is read-only, but it exposes send eligibility. Require organization
setup and current legal acceptance. Members may preview if they can access the
campaign area, but they still cannot mutate campaigns.

## Tests

Add or extend tests in:

- `packages/shared/test/contracts/campaigns.test.ts`
- `packages/db/test/queries/campaigns.test.ts`
- `apps/api/test/features/campaigns/campaigns.routes.test.ts`

Minimum coverage:

- invalid `lapsedDays` values are rejected
- default audience rule uses 90 days and excludes missing booking dates
- eligible count excludes suppressed contacts
- eligible count excludes contacts without normalized phones
- eligible count excludes contacts without consent
- `includeNoBookingDate` changes the query behavior
- preview routes always use authenticated `organizationId`
- approval tests can reuse the same helper so preview and approval cannot drift

## Verification

Run:

```bash
pnpm --filter @retaino/shared test
pnpm --filter @retaino/db test
pnpm --filter @retaino/api test -- campaigns
pnpm --filter @retaino/api typecheck
```

## Risks

- Counting contacts that cannot legally receive SMS.
- Making preview behavior differ from approval behavior.
- Loading too many contacts into memory.
- Forgetting that suppressions can change between preview and send.
- Caching audience eligibility and showing stale suppression or consent state.
