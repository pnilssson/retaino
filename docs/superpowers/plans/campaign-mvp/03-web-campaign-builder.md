# Phase 3: Web Campaign Builder

## Goal

Replace the campaign placeholder with a focused campaign builder for one
audience and one SMS message. Users should be able to create and edit campaign
drafts, choose a lapsed audience rule, write SMS copy, enter a booking URL, and
see audience preview feedback.

This phase does not approve or send campaigns.

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

Create:

- `apps/web/src/features/campaigns/query-keys.ts`
- `apps/web/src/features/campaigns/hooks/use-campaigns.ts`
- `apps/web/src/features/campaigns/hooks/use-campaign.ts`
- `apps/web/src/features/campaigns/hooks/use-create-campaign.ts`
- `apps/web/src/features/campaigns/hooks/use-update-campaign.ts`
- `apps/web/src/features/campaigns/hooks/use-campaign-audience-preview.ts`
- `apps/web/src/features/campaigns/components/campaigns-screen.tsx`
- `apps/web/src/features/campaigns/components/campaign-form.tsx`
- `apps/web/src/features/campaigns/components/audience-rule-fields.tsx`
- `apps/web/src/features/campaigns/components/audience-preview.tsx`

Modify:

- `apps/web/src/app/(app)/app/campaigns/page.tsx`

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

Start with a single screen:

- campaign list on the left or top
- draft editor as the primary work area
- lapsed audience controls with presets: 30, 60, 90, 180 days
- optional custom lapsed days input within backend bounds
- checkbox for including contacts without a booking date
- SMS body field
- booking URL field
- optional campaign code or reference field
- audience preview count and small sample
- save action

The SMS field supports only `{first_name}` and `{last_booking_date}` as
personalization tokens. The UI should show that Retaino appends the tracked
booking link and required opt-out text automatically. Do not ask the user to
place a link, unsubscribe, or opt-out token.

Default the audience controls to 90 lapsed days and leave contacts without a
booking date excluded until the user checks the option.

Avoid advanced layout. This is an operational tool, not a marketing page.

## Backend Dependencies

Requires phases 1 and 2:

- draft campaign routes
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
- form fields fit on desktop and mobile
- audience preview loading, empty, success, and error states are visible
- save errors are shown inline
- changing active organization shows that organization's campaign drafts only

## Risks

- Hand-rolling form state instead of using TanStack Form.
- Creating UI for variants, saved segments, or journeys too early.
- Asking users to manage link placeholders or unsupported SMS personalization
  tokens.
- Making the page depend on Twilio before live sending exists.
- Hiding audience eligibility reasons from the user.
- Keying campaign queries without organization ID and leaking cached data across
  organization switches.
