# Phase 3: Web Campaign Builder

## Goal

Replace the campaign placeholder with a campaign index and a focused campaign
builder for one audience and one SMS message. Users should be able to review
existing campaigns from `/app/campaigns`, then create or edit a campaign on a
dedicated builder route.

This phase does not launch or send campaigns.
Draft remains an internal persistence status. User-facing campaign creation
copy should say "campaign", not "campaign draft", except when displaying a
campaign list status.

## Product Model

Keep the interface close to the user's job:

- who should receive this campaign
- what should the SMS say
- where should the recipient book
- how many eligible customers match

Do not expose saved segments, branching, journeys, or multi-message variants.
Users create separate campaigns for separate lapsed windows or offers.

## Web Shape

Use existing app-shell patterns under `apps/web/src/features/campaigns`.
Follow the guided-flow baseline in `docs/ux/guided-flows.md`.

Create:

- `apps/web/src/features/campaigns/query-keys.ts`
- `apps/web/src/features/campaigns/hooks/use-campaigns.ts`
- `apps/web/src/features/campaigns/hooks/use-campaign.ts`
- `apps/web/src/features/campaigns/hooks/use-create-campaign.ts`
- `apps/web/src/features/campaigns/hooks/use-update-campaign.ts`
- `apps/web/src/features/campaigns/hooks/use-campaign-audience-preview.ts`
- `apps/web/src/features/campaigns/components/campaigns-screen.tsx`
- `apps/web/src/features/campaigns/components/campaign-builder-screen.tsx`
- `apps/web/src/features/campaigns/components/campaign-filters.tsx`
- `apps/web/src/features/campaigns/components/campaign-form.tsx`
- `apps/web/src/features/campaigns/components/audience-rule-fields.tsx`
- `apps/web/src/features/campaigns/components/audience-preview.tsx`

Shared guided-flow primitives live outside the feature folder and stay
presentational. Campaign-specific form state, validation, API calls, and
audience preview logic remain in the campaign feature.

Modify:

- `apps/web/src/app/(app)/app/campaigns/page.tsx`
- `apps/web/src/app/(app)/app/campaigns/new/page.tsx`
- `apps/web/src/app/(app)/app/campaigns/[id]/page.tsx`

Rules:

- forms use TanStack Form
- data fetching uses existing API client and React Query patterns
- campaign query keys include the active Retaino organization ID
- audience preview query keys include organization ID and normalized audience
  rule values
- feature `components` folder contains `.tsx` files only
- feature `hooks` folder contains `use-*.ts` or `use-*.tsx` files only
- pure helpers and query keys live directly in the feature folder
- do not add tests to `apps/web`

## UX Scope

Start with a campaign index at `/app/campaigns`:

- campaign list similar to the contacts list
- search by campaign name or code/reference
- filter by campaign status
- sort by created date, name, status, or lapsed days
- show campaign status, audience summary, created date, and an open action
- link admins to `/app/campaigns/new` for a new campaign

Use dedicated builder routes:

- `/app/campaigns/new` creates a campaign with internal draft persistence as
  soon as the admin continues from the audience step
- `/app/campaigns/[id]` edits an existing campaign while it is still editable

The builder uses a guided flow instead of one long form:

1. Audience: campaign name, lapsed audience controls with presets, optional
   custom lapsed days input within backend bounds, checkbox for including
   contacts without a booking date, and audience preview.
2. Message: SMS body, supported personalization token buttons, a plain
   character count, estimated SMS per recipient, and a recipient preview.
3. Booking: booking URL and optional campaign code or reference.
4. Review: read-only summary and save campaign action.

The campaign should be persisted as a recoverable draft when the user first
continues from Audience to Message. Later step transitions patch the same draft.
The final review save remains useful as an explicit last persistence action, but
it should not be the first time the campaign exists in the database.

Use the shared top progress tracker from the guided-flow baseline. Do not add a
persistent summary beside the campaign form, because it narrows the active work
area. The review step is where the campaign is summarized.

The SMS field supports only `{first_name}` and `{last_booking_date}` as
personalization tokens. The UI should show that Retaino appends the tracked
booking link and required opt-out text automatically. Do not ask the user to
place a link, unsubscribe, or opt-out token.

Use the shared `createCampaignSmsPreview` helper from `packages/shared` for the
message step. The web composer should not maintain its own segment-count logic.
The helper renders sample personalization values, appends a sample tracked
booking link and opt-out text, and estimates SMS per recipient using the same
rules that provider preview and send code must reuse in later phases. Later API
test-send and live-send code must use `renderCampaignSms` with exact recipient
values and the recipient-specific tracking link. This prevents the composer
from showing one estimate while the API later reserves or charges a different
number of SMS credits.

Keep the composer language non-technical. Show labels such as `Characters` and
`Estimated SMS per recipient`; do not expose GSM-7, Unicode, UCS-2, or carrier
segment terminology in the campaign builder. If the estimate is more than one
SMS per recipient, use neutral language such as `Longer messages may use more
SMS credits.`

Default the audience controls to 90 lapsed days and leave contacts without a
booking date excluded until the user checks the option.

Avoid advanced layout. This is an operational tool, not a marketing page.
Avoid showing all campaign decisions at once.

## Backend Dependencies

Requires phases 1 and 2:

- campaign persistence routes
- audience preview routes
- shared campaign contracts

If a backend route is missing, stop and finish the matching backend phase
instead of mocking campaign behavior in the web app.

## Verification

Run:

```bash
pnpm --filter @retaino/web typecheck
pnpm --filter @retaino/web lint
```

Do not start the dev server, run Playwright, or open browser verification from
an agent session for this phase. The user will run the web app and verify the UI
manually.

Manual UI checks for the user:

- campaign page no longer shows a placeholder
- campaign index lists drafts and later non-draft campaign statuses
- campaign index supports search, filtering, and sorting
- new and existing editable campaigns open on dedicated builder routes
- the builder shows one active step at a time
- form fields fit on desktop and mobile
- audience preview loading, empty, success, and error states are visible
- save errors are shown inline
- message preview includes sample personalization, the tracked booking link,
  opt-out text, character count, and estimated SMS per recipient
- changing active organization shows that organization's campaigns only

## Risks

- Hand-rolling form state instead of using TanStack Form.
- Creating UI for variants, saved segments, or journeys too early.
- Asking users to manage link placeholders or unsupported SMS personalization
  tokens.
- Reimplementing SMS estimate logic in the web app instead of using the shared
  helper that provider preview and send code will reuse.
- Making the page depend on Twilio before live sending exists.
- Hiding audience eligibility reasons from the user.
- Keying campaign queries without organization ID and leaking cached data across
  organization switches.
