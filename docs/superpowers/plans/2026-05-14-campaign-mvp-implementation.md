# Campaign MVP Implementation

> **For agentic workers:** Use this document as the campaign MVP index. Load
> only the phase document you are implementing, plus the required project docs:
> `docs/architecture.md`, `docs/product.md`, `docs/compliance.md`, and
> `docs/tracking.md`.

## Direction

Retaino v1 campaigns use one audience and one SMS message per campaign.
Different lapsed windows, offers, or copy variants are separate campaigns.
Reusable saved segments, branching journeys, and multi-message variants are
deferred until customers need advanced campaign operations.

This is both backend and frontend work. The first two phases build stable
backend APIs, phase 3 turns those APIs into a usable campaign builder, and the
remaining phases add approval, sending, tracking, and reporting.

Campaign implementation should build from the smallest useful workflow toward
safe live sending:

1. Store draft campaign intent.
2. Preview the eligible audience.
3. Give users a simple campaign builder in the web app.
4. Approve and snapshot recipients.
5. Send test SMS through the provider adapter.
6. Create tracking links and send live campaigns in background jobs.
7. Ingest provider callbacks, STOP replies, clicks, and reports.

Twilio is the MVP provider because `docs/architecture.md` and
`docs/product.md` already choose it. The implementation should still hide
Twilio behind an internal SMS provider adapter so campaign workflows do not
depend on Twilio payloads or SDK types.

Production sending should prefer a Twilio Messaging Service so sender
configuration, routing, and opt-out behavior are managed in one place. Keep a
direct `from` phone fallback only for local or test-credential mode, because
Twilio test credentials do not support `MessagingServiceSid`.

Implement Twilio sending with the REST API first, not the Twilio Node SDK, so it
works predictably in Cloudflare Workers. If the SDK is introduced later, it must
stay behind the same provider adapter.

SMS sending mode must be centralized in the SMS provider factory, not checked
throughout routes, services, or jobs. The adapter should be the only place that
decides whether sending is disabled, using Twilio test credentials, or using
live Twilio credentials.

## MVP Scope

Build only what helps a user create and send a clear reactivation campaign:

- draft campaigns
- lapsed audience rules
- audience preview
- one SMS message
- one booking URL
- optional campaign code
- required opt-out text
- approval with recipient snapshot
- test send
- per-recipient tracking links
- live send
- delivery, click, opt-out, and basic campaign metrics

Do not build saved segments, variants, journeys, A/B tests, copy generation,
scheduled recurring sends, or booking attribution in this campaign plan.
Do not build SMS template variables in MVP. Users write offer copy, then
Retaino appends the tracked booking link and required opt-out text in the final
rendered SMS.

## Twilio Testing Strategy

Use three testing layers:

1. Fake provider tests for normal automated coverage. Inject a fake SMS provider
   into campaign services to simulate success, provider errors, retries, missing
   config, delayed callbacks, and opt-out replies.
2. Optional Twilio test-credential checks for request-shape validation. Twilio
   test credentials do not send real SMS, do not charge the account, return fake
   message SIDs, do not trigger status callbacks, and do not support
   `MessagingServiceSid`.
3. Manual live smoke testing from development or staging when explicitly
   configured for live sending. This is how real sender configuration, status
   callbacks, inbound replies, and STOP handling are verified.

Do not rely on Twilio test credentials for callback or Messaging Service
coverage. Use signed webhook fixture tests for callback handling.

Store both estimated and actual SMS segment counts. Estimates power the draft
and approval UI; actual provider values are stored from Twilio responses and
callbacks so reporting can show drift over time.

## Billing And Credits Direction

Stripe is the source of truth for payments, subscriptions, checkout sessions,
and customer portal sessions. Retaino is the source of truth for operational SMS
credit balance through SMS credit transactions funded by Stripe webhooks.

Campaign sends use a campaign-level credit check:

1. Estimate required credits for the full approved campaign.
2. Read the organization's Retaino SMS credit balance.
3. Block live send if the balance is lower than the estimate.
4. Send the campaign as a background job.
5. Store actual provider segment counts.
6. Record actual SMS segment usage as a Retaino credit transaction after sends.

Do not check credits before every individual SMS. That creates partial
campaign-send behavior that is worse for users. To avoid two campaign jobs
spending the same credit balance, allow only one active live send per
organization at a time.

## Non-Negotiables

- Every tenant-owned campaign table includes `organizationId`.
- Every query requires `organizationId` at the boundary.
- Never process a campaign, recipient, message, link, or event by ID alone.
- Routes stay thin. Business rules live in campaign services or DB queries.
- Shared request and response contracts live in `packages/shared`.
- Database access comes from `packages/db`, not inline route SQL.
- Web forms use TanStack Form. Do not hand-roll form state.
- Campaign sends and reconciliation run in background jobs, not HTTP requests.
- Suppression checks run during audience preview, approval, and immediately
  before send.
- Twilio credentials and sender configuration stay in environment bindings.
- Drizzle migrations are generated from schema changes. Do not manually edit
  migration SQL or migration metadata.
- Campaign booking URLs must be validated as `http` or `https` URLs. Do not
  allow arbitrary schemes in campaign links.
- Campaign codes are optional attribution hints, not unique identifiers. Store a
  normalized value, but do not rely on campaign codes alone for attribution.

## Quality Bar

MVP does not mean loose. Each phase should be small, testable, and complete:

- implement only the data and behavior the phase uses
- write package-level tests for non-web logic
- avoid duplicate schemas, helpers, or status strings
- prefer explicit lifecycle states over ambiguous booleans
- keep provider and job idempotency risks visible in tests
- make preview, approval, and send eligibility use the same underlying rules
- stop after each phase for review instead of blending future work into it

## Phase Documents

| Phase | Outcome | Document |
| --- | --- | --- |
| 1. Draft Foundation | Create, read, update, and delete campaign drafts. | `docs/superpowers/plans/campaign-mvp/01-draft-foundation.md` |
| 2. Audience Preview | Count and sample eligible lapsed contacts before approval. | `docs/superpowers/plans/campaign-mvp/02-audience-preview.md` |
| 3. Web Campaign Builder | Let users create and edit one-audience, one-message campaigns. | `docs/superpowers/plans/campaign-mvp/03-web-campaign-builder.md` |
| 4. Approval Snapshot | Freeze recipients and add the campaign approval UI. | `docs/superpowers/plans/campaign-mvp/04-approval-snapshot.md` |
| 5. SMS Provider And Test Sends | Preview SMS cost and let admins send test messages. | `docs/superpowers/plans/campaign-mvp/05-sms-provider-test-sends.md` |
| 6. Tracking Links And Live Send Jobs | Create recipient links, send campaigns, and show send state. | `docs/superpowers/plans/campaign-mvp/06-live-send-jobs.md` |
| 7. Events, Tracking, Reporting | Handle callbacks, STOP replies, clicks, and show campaign metrics. | `docs/superpowers/plans/campaign-mvp/07-events-tracking-reporting.md` |

## Suggested Execution

Implement one phase at a time. Before starting a phase, update that phase
document if product or architecture decisions changed. After finishing a phase,
run the package tests and typechecks named in the phase document, then stop for
review before loading the next phase.

The first user-visible milestone is phase 3: a campaign builder that saves a
draft and previews the audience. Do not wait for Twilio to build that value.

## Deferred Decisions

- Saved reusable segments.
- Multiple audience or message variants inside one campaign.
- Journey-style automation.
- Booking CSV reconciliation and attribution matching.
- A public tracking redirect route can be planned with phase 6, but booking
  reconciliation should remain a separate plan.
