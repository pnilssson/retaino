# Phase 1: Campaign Persistence Foundation

## Goal

Create the backend foundation for campaigns that are still being prepared. A
user should be able to create, list, read, update, and delete internally drafted
campaigns for the active organization.

This phase does not send SMS, launch campaigns, snapshot recipients, or create
tracking links.

Draft is a persistence status, not the main user-facing creation outcome. The
web app may show `Draft` in the campaign list status, but campaign creation copy
should say `New campaign`.

## Product Model

One campaign has one audience rule and one SMS message. If a customer wants a
30-day and 90-day lapsed campaign, they create two campaigns.

Internally drafted campaigns store intent:

- name
- audience rule
- SMS body
- booking URL
- optional campaign code or reference for booking-export matching
- attribution window
- status

Draft campaigns may be incomplete. As soon as an admin completes the audience
step and moves forward, Retaino creates a draft row with the campaign name and
audience rule. `smsBody` and `bookingUrl` remain nullable until the user reaches
and saves those steps. Later test-send and launch phases must validate that
message and booking fields are complete before send readiness.

The stored SMS body is offer copy with limited personalization. Support only
`{first_name}` and `{last_booking_date}` in MVP. Later phases render the final
SMS by replacing those tokens per recipient, then appending the tracked booking
link and required opt-out text.

## Backend Shape

Create shared campaign contracts first, then the database schema, then query
functions, then Hono routes.

### Shared Contracts

Create `packages/shared/src/contracts/campaigns.ts` and export it from
`packages/shared/src/contracts/index.ts`.

Core schemas:

- `campaignStatusSchema`: `draft`, `ready_to_send`, `sending`, `sent`, `failed`
- `campaignAudienceRuleSchema`: `{ lapsedDays, includeNoBookingDate }`
- `createCampaignDraftSchema`
- `updateCampaignDraftSchema`
- `campaignSchema`
- `CampaignResponse`
- `CampaignListResponse`

Booking URLs must be `http` or `https`. Campaign codes should be trimmed,
uppercased, and stored as nullable values. A campaign code is not only a
discount code. It can be a campaign reference, offer code, source tag, or
booking-export value. Do not treat the campaign code as a unique campaign
identifier.

Create requests only require campaign name and audience rule. Message and
booking URL are optional nullable draft fields, but when either field is
provided it must pass the same validation used before test send and launch.

Reject SMS bodies that contain unsupported personalization syntax such as
`{{link}}`, `{link}`, `{unsubscribe}`, or unknown `{...}` tokens. The system owns
link and opt-out rendering.

Initial audience rule:

```ts
{
  lapsedDays: number; // integer, 30 to 365
  includeNoBookingDate: boolean;
}
```

### Database

Create `packages/db/src/schema/campaigns.ts` and export it from
`packages/db/src/schema/index.ts`.

Start with a `campaigns` table only:

- `id`
- `organizationId`
- `createdByUserId`
- `name`
- `status`
- `audienceRule`
- `smsBody`
- `bookingUrl`
- `campaignCode`
- `attributionWindowDays`
- `createdAt`
- `updatedAt`

Do not add launch, sending, provider, recipient, tracking, or report fields in
this phase. Add those fields in the phase that first uses them.

`smsBody` and `bookingUrl` are nullable because campaign drafts are persisted
before those steps are complete.

Indexes:

- organization plus created date
- organization plus status

Generate the migration with the project migration command. Do not manually edit
generated SQL or metadata.

### Query Layer

Create `packages/db/src/queries/campaigns.ts` and export it from
`packages/db/src/queries/index.ts`.

Required functions:

- `createCampaignDraft`
- `listCampaigns`
- `getCampaignById`
- `updateCampaignDraft`
- `deleteCampaignDraft`
- `assertCampaignDraftStatus`

Rules:

- every function requires `organizationId`
- update and delete only work while status is `draft`
- no query fetches by campaign ID alone
- query functions return shared contract shapes where practical

### API

Create `apps/api/src/features/campaigns/campaigns.routes.ts` and mount it in
`apps/api/src/server.ts` after organization routes.

Routes:

- `GET /v1/campaigns`
- `POST /v1/campaigns`
- `GET /v1/campaigns/:id`
- `PATCH /v1/campaigns/:id`
- `DELETE /v1/campaigns/:id`

Mutation routes require the same setup, legal, and admin checks as contact
imports. Create `requireCampaignEligibility` in
`apps/api/src/features/organization/organization.gates.ts`.

## Tests

Add tests in:

- `packages/shared/test/contracts/campaigns.test.ts`
- `packages/db/test/schema/campaigns.test.ts`
- `packages/db/test/queries/campaigns.test.ts`
- `apps/api/test/features/campaigns/campaigns.routes.test.ts`

Minimum coverage:

- shared schemas accept valid drafts and reject invalid audience rules
- shared schemas reject non-HTTP booking URLs
- shared schemas normalize campaign codes
- shared schemas allow `{first_name}` and `{last_booking_date}`
- shared schemas reject unsupported SMS personalization syntax
- campaign table exposes `organizationId`
- query helpers include tenant filters
- launched or sending campaigns cannot be updated or deleted
- route handlers pass authenticated `organizationId`, never body org IDs
- members can read campaigns but cannot create, update, or delete

## Verification

Run:

```bash
pnpm --filter @retaino/shared test
pnpm --filter @retaino/shared typecheck
pnpm --filter @retaino/db test
pnpm --filter @retaino/db typecheck
pnpm --filter @retaino/api test
pnpm --filter @retaino/api typecheck
```

## Risks

- Accidentally allowing updates after launch.
- Storing organization IDs from the request body.
- Putting business rules directly in Hono route handlers.
- Overbuilding saved segments before campaign-owned rules exist.
