# Campaign MVP Implementation

> **For agentic workers:** Use this document as the canonical campaign MVP
> state. Load this document plus the required project docs:
> `docs/architecture.md`, `docs/product.md`, `docs/compliance.md`, and
> `docs/tracking.md`.

## Direction

Retaino v1 campaigns use one audience and one SMS message per campaign.
Different lapsed windows, offers, or copy variants are separate campaigns.
Reusable saved segments, branching journeys, and multi-message variants are
deferred until customers need advanced campaign operations.

This is both backend and frontend work. The first two phases build stable
backend APIs, phase 3 turns those APIs into a usable campaign builder, and the
remaining phases add sender setup, test sending, launch, tracking, and
reporting. Phases 1 through 7 are implemented. This document is the canonical
state for the campaign MVP after the first deep branch review.

## Campaign UX Direction

Users create campaigns. Retaino may store draft rows, but the campaign creation
flow should not make "creating a draft" feel like the user's goal. Draft belongs
as an internal persistence status and as a campaign list status label for work
that has not launched yet.

The final user-facing campaign flow is:

1. Choose audience.
2. Write the SMS.
3. Add booking details.
4. Set up or confirm the sender.
5. Review the campaign and send a test SMS.
6. Send the campaign.

The final action is `Send campaign`. There is no separate user-facing `Approve`
step. Internally, Retaino must still freeze the campaign configuration,
snapshot selected recipients, audit the actor, reserve credits, create tracking
links, and enqueue the send job. Those are system responsibilities behind the
send action.

Research across SMS and email campaign tools points to the same pattern:
campaigns are built through audience, content, preview, review, test, and final
send or schedule. Drafts are treated as recoverable in-progress work, not as the
main success state. Retaino should persist the draft as soon as the user moves
past the audience step, then patch the same campaign as later steps are
completed.

Campaign implementation should build from the smallest useful workflow toward
safe live sending:

1. Store in-progress campaign intent.
2. Preview the eligible audience.
3. Give users a simple campaign builder in the web app.
4. Provision the organization sender and send test SMS through the provider
   adapter.
5. Freeze recipients as part of the final send action.
6. Create tracking links and send live campaigns in background jobs.
7. Ingest provider callbacks, STOP replies, clicks, and reports.

Twilio is the MVP provider because `docs/architecture.md` and
`docs/product.md` already choose it. The implementation should still hide
Twilio behind an internal SMS provider adapter so campaign workflows do not
depend on Twilio payloads or SDK types.

The provider adapter must be provider-neutral. Retaino owns concepts such as
organization sender, sender option, sender capability, rendered SMS, outbound
message result, inbound message, provider status event, provider error, and
webhook verification. Twilio-specific concepts such as Messaging Services,
Message SIDs, phone number SIDs, and Twilio callback parameters stay inside the
Twilio adapter. The same boundary should be able to support providers such as
Vonage, Sinch, Bird, MessageBird, Telnyx, or another SMS provider later.

Production sending uses one Twilio Messaging Service and one SMS-capable Twilio
number per organization so sender configuration, routing, and opt-out behavior
are tenant-local. If optional Twilio test-credential request-shape checks are
added, they may use a direct `from` phone fallback because Twilio test
credentials do not support `MessagingServiceSid`. Normal local development uses
the Retaino fake provider instead.
Live campaign senders must support the opt-out path Retaino shows in the final
message. Do not use one-way alphanumeric sender IDs for live campaigns while
reply-based STOP handling is the only opt-out mechanism.
Do not use one shared Retaino sender number across organizations.

Implement Twilio sending with the REST API first, not the Twilio Node SDK, so it
works predictably in Cloudflare Workers. If the SDK is introduced later, it must
stay behind the same provider adapter.

SMS sending mode must be centralized in the SMS provider factory, not checked
throughout routes, services, or jobs. Supported runtime modes are:

- `disabled`: block sends with a clear configuration error.
- `test`: use a deterministic Retaino fake provider and never call an external
  SMS provider. This mode supports local development, automated tests, and UI
  verification before Twilio account approval.
- `live`: use the configured live provider adapter.

Optional Twilio test-credential checks are request-shape tests only. They are
not the normal local runtime path because Twilio test credentials do not send
real SMS, do not trigger callbacks, and do not support Messaging Services.

## MVP Scope

Build only what helps a user create and send a clear reactivation campaign:

- internal draft persistence for in-progress campaigns
- lapsed audience rules
- audience preview
- one SMS message
- one booking URL
- optional campaign code or reference for booking-export matching
- required opt-out text
- dedicated organization sender provisioning
- test send
- launch snapshot owned by the final send action
- per-recipient tracking links
- live send
- delivery, click, reply, opt-out, and basic campaign metrics
- inbound reply storage for future inbox support

Do not build saved segments, variants, journeys, A/B tests, copy generation,
scheduled recurring sends, or booking attribution in this campaign plan.
Support only `{first_name}` and `{last_booking_date}` personalization tokens in
MVP SMS copy. Retaino replaces those tokens when rendering each recipient SMS,
then appends the tracked booking link and required opt-out text. Retaino owns
system tokens and must reject user-authored link, unsubscribe, opt-out, or
unknown `{...}` tokens.

## Sender Provisioning Direction

Retaino provisions Twilio sender resources lazily. An organization may create
campaigns and preview audiences without a sender. Before the first test
send or live send, an admin must have an active paid subscription and current
legal acceptance, then Retaino creates or reuses:

1. One organization-selected SMS-capable Twilio phone number.
2. One Twilio Messaging Service for the organization.
3. A sender-pool association between that number and Messaging Service.
4. Service-level inbound and status callback URLs.

Provisioning should run as an idempotent background job or idempotent service
operation. Store provider resource IDs, E.164 number, provisioning state,
failure reason, and timestamps in Retaino. Twilio credentials stay in
environment bindings.

Onboarding collects the organization identity and address fields Retaino can
know upfront for sender compliance. Sender setup should not ask for those same
company details again. If the selected sender country or number type requires
additional regulatory data, the organization admin completes that in Retaino.
Retaino staff must not manually configure each customer. Countries or number
types that cannot be self-served through Retaino are unavailable in MVP.

The admin chooses the sender country based on the recipient market, then selects
an available SMS-capable number or accepts a recommended number. Do not infer
sender country only from the organization's legal address.

Twilio Messaging Service configuration APIs are not all equally stable. If a
required service setting cannot be configured reliably through the API, mark the
sender as `failed` or `manual_action_required` with a clear internal reason
instead of treating the sender as ready.

Do not provision Twilio numbers immediately after Stripe checkout. That creates
recurring sender cost for organizations that have not yet reached campaign
send-readiness. Do not wait until the live send button either, because users
need the dedicated sender to send a realistic test SMS before launch.

## Provider Testing Strategy

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

Store both estimated and actual SMS segment counts. Estimates power the campaign
builder and launch UI; actual provider values are stored from Twilio responses
and callbacks so reporting can show drift over time.
Define one SMS encoding policy for MVP. Either disable provider-side Smart
Encoding or mirror the same substitutions in Retaino's preview counter. The
preview and send job must estimate the exact rendered body that will be sent.

## Billing And Credits Direction

Stripe is the source of truth for payments, subscriptions, checkout sessions,
and customer portal sessions. Retaino is the source of truth for operational SMS
credits through immutable SMS credit transaction rows funded by Stripe webhooks.
Campaign work should consume the local billing projection for subscription
status and derive SMS credit balance from the transaction ledger. It should not
introduce a second payment provider, a parallel checkout flow, or separate
campaign-specific billing state.

Campaign sends use a campaign-level credit check:

1. Estimate required credits for the full campaign.
2. Require an active subscription in the local Stripe-backed billing projection.
3. Read the organization's Retaino SMS credit balance.
4. Block live send if the available balance is lower than the estimate.
5. Reserve the estimated credits by appending matching SMS credit transaction
   rows.
6. Send the campaign as a background job.
7. Store actual provider segment counts.
8. Reconcile reserved and actual SMS segment usage through SMS credit
   transaction rows after sends.

Use the shared SMS credit ledger model instead of campaign-specific
transaction types. `transactionType` describes the financial action and remains
one of the shared billing values, such as `debit` or `adjustment`. Campaign
intent is recorded through `source`, using `campaign_send` for live sends and
`campaign_test_send` for test sends. `sourceId` must identify the operation
idempotently, for example `campaign-send:<campaignId>` for the reservation and
`campaign-send:<campaignId>:release` for release rows.

Do not check credits before every individual SMS. That creates partial
campaign-send behavior that is worse for users. To avoid two campaign jobs
spending the same credit balance, allow only one active live send per
organization at a time. Inngest event idempotency is useful, but database
idempotency and credit reservations are the source of truth because campaign
send retries can happen after the event-level idempotency window.

## Non-Negotiables

- Every tenant-owned campaign table includes `organizationId`.
- Every query requires `organizationId` at the boundary.
- Never process a campaign, recipient, message, link, or event by ID alone.
- Routes stay thin. Business rules live in campaign services or DB queries.
- Shared request and response contracts live in `packages/shared`.
- Database access comes from `packages/db`, not inline route SQL.
- Web forms use TanStack Form. Do not hand-roll form state.
- Campaign sends and reconciliation run in background jobs, not HTTP requests.
- Suppression checks run during audience preview, launch snapshot, and
  immediately before send.
- Twilio credentials stay in environment bindings. Organization sender
  configuration stores provider resource IDs only.
- Drizzle migrations are generated from schema changes. Do not manually edit
  migration SQL or migration metadata.
- Campaign booking URLs must be validated as `http` or `https` URLs. Do not
  allow arbitrary schemes in campaign links.
- Public tracking links use `https://go.retaino.com/r/:code`.
- Public tracking redirects use Cloudflare Worker rate-limiting bindings before
  database lookup. The MVP uses one route-level limiter and one tracking-code
  limiter.
- Click events store the tracking link, campaign, recipient, timestamp, and
  user agent. Do not add persisted IP addresses or IP-derived metadata to MVP
  click tracking.
- Twilio inbound and status webhooks use
  `https://api.retaino.com/v1/webhooks/twilio/messaging/inbound` and
  `https://api.retaino.com/v1/webhooks/twilio/messaging/status`.
- Twilio `OptOutType=STOP` creates a suppression. Twilio `START` and `HELP`
  events are stored as replies and must not suppress the phone number.
- Campaign codes are optional attribution hints, not unique identifiers and not
  only discount codes. They may contain a campaign reference, offer code, source
  tag, or booking-export value. Store a normalized value, but do not rely on
  campaign codes alone for attribution.

## Quality Bar

MVP does not mean loose. Each phase should be small, testable, and complete:

- implement only the data and behavior the phase uses
- write package-level tests for non-web logic
- avoid duplicate schemas, helpers, or status strings
- prefer explicit lifecycle states over ambiguous booleans
- keep provider and job idempotency risks visible in tests
- make preview, launch snapshot, and send eligibility use the same underlying
  rules
- stop after each phase for review instead of blending future work into it

## Implemented Scope Summary

Phases 1 through 7 are implemented and consolidated into this canonical plan:

| Area | Implemented outcome |
| --- | --- |
| Campaign persistence | Create, list, read, update, and delete internally drafted campaigns. Only draft campaigns are editable or deletable. |
| Audience preview | Count and sample eligible lapsed contacts with consent, normalized phone, and suppression filtering. Preview and send paths share eligibility rules. |
| Web campaign builder | Campaign list, campaign filters, draft creation, campaign editing, audience preview, message writing, booking details, sender setup, review, test send, and final send. |
| Sender setup and test sends | Organization sender provisioning, sender readiness checks, provider-neutral SMS adapter, deterministic fake provider, and admin test sends. |
| Launch snapshot | Recipient snapshots are created by the final send action. There is no separate public launch endpoint in the MVP. |
| Live send jobs | Final send freezes recipients, reserves credits, creates tracking links, and enqueues the Inngest background job. The job re-checks suppressions before provider send and reconciles unused credits. |
| Events, tracking, and reporting | Provider status callbacks, inbound replies, STOP suppressions, public tracking redirects, click recording without persisted IP data, and campaign activity reports. |

## Review Status

Phases 1 through 7 have been implemented and completed one deep branch review.
The review log is
`docs/superpowers/plans/campaign-review.md`.
The condensed finding audit trail is
`docs/superpowers/plans/campaign-audit.md`.

Manual UI review remains owner-led. Agent-created browser walkthroughs and
screenshots are intentionally out of scope for the review log.

## Deferred Decisions

- Saved reusable segments.
- Multiple audience or message variants inside one campaign.
- Journey-style automation.
- Booking CSV reconciliation and attribution matching.
- Booking reconciliation should remain a separate plan even though public
  tracking redirects and click reporting are now implemented.
