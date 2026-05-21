# Campaign MVP Review Findings Audit

> Condensed audit trail for the first deep review of the campaign MVP branch.
> The canonical product and implementation state is
> `docs/superpowers/plans/campaign-mvp.md`.

## Review Baseline

- Branch: `codex/campaign-mvp`
- Review base: `addd5f0bd97cd7c7d95b1b85ecefce380c89010a`
- Phase 1 commit included in review:
  `33ba067 feat: add campaign draft foundation`
- Review log:
  `docs/superpowers/plans/campaign-review.md`

## Critical Findings Fixed

| ID | Finding | Fix |
| --- | --- | --- |
| RM-01 | One active live send per organization needed database-level enforcement. | `startCampaignSend` now takes an organization advisory transaction lock before checking active sends and transitioning a campaign to `sending`. |
| RM-02 | Provider failures needed clear campaign recovery and diagnosis behavior. | `processCampaignSend` marks campaigns `failed`, releases unused credits, writes a failure audit event, and rethrows for Inngest visibility. |
| LC-01 | Background retries could duplicate provider sends for unresolved message rows. | Existing outbound rows without a provider message ID are treated as unresolved attempts and fail the campaign instead of sending again. |
| LC-02 | Terminal campaign states could happen before credit release and audit writes. | Success and failure paths release unused credits and write audit data before marking terminal campaign states. |
| LC-03 | Final send could return queued before SMS credits were reserved. | The send route now reserves campaign credits before enqueueing the Inngest job, so insufficient credits block the request before the campaign appears queued. |
| LC-04 | Retryable start failures could release a reservation and burn the campaign reservation source ID. | Active-send conflicts now keep the existing reservation for the next retry, and send processing reconciles against the actual ledger reservation amount. |
| LC-05 | Later provider status callbacks that omitted segment or cost fields could erase values already captured from the initial provider send response. | Provider result updates now preserve existing actual segment count, cost, and currency when a callback omits those fields. |
| LC-06 | Initial provider send responses that omitted segment counts could leave message actual segments empty while campaign credit reconciliation used the estimate. | Campaign sends now store the same estimated segment fallback on the message row that the campaign reconciliation uses. Later callbacks can still replace it with a provider value. |
| LC-07 | Duplicate campaign send jobs for the same campaign could overlap during provider sending. | The Inngest campaign send function now uses singleton skip mode keyed by campaign ID. |
| LC-08 | If final-send credit reservation succeeded but background enqueue failed, credits could remain reserved without a send job. | `queueCampaignSend` now releases the live-send reservation when enqueueing fails, then rethrows the enqueue error. |
| LC-09 | Sender readiness checks before test sends and live-send queueing only checked status, not the provider resource needed for actual sending. | Campaign send services now require a ready sender with a provider Messaging Service ID before reserving credits or queueing sends. |
| LC-10 | Public sender status could still show `ready` for an incomplete provider setup that the send services would reject. | Public sender responses now derive readiness from the same provider Messaging Service invariant without exposing provider IDs. |

## Important Findings Fixed

| ID | Finding | Fix |
| --- | --- | --- |
| RM-03 | Campaign credit transaction naming differed from the shared billing model. | The campaign plan now blesses `transactionType` for financial action and `source`/`sourceId` for campaign send intent and idempotency. |
| RM-04, TR-01 | Public redirect abuse protection needed to cover unknown-code scans before database lookup. | Redirects now use Cloudflare Worker rate-limiting bindings for route-level traffic and tracking-code traffic. |
| RM-05 | Click tracking needed a smaller data footprint. | Click events store the link, campaign, recipient, timestamp, and user agent needed for reporting. |
| RM-06 | Twilio webhook verification needed to match current official behavior. | Form callbacks sign sorted form fields. JSON callbacks require matching `bodySHA256` and sign the exact callback URL. |
| RM-07 | Fake provider coverage needed deterministic failures and inbound payload parsing. | Test mode now supports known recipient failure numbers and Twilio-shaped status and inbound webhook payloads. |
| RM-08 | Launch snapshot needed to be internal behind the final send action. | The send route owns draft launch snapshot creation before enqueueing the Inngest job. No separate public launch endpoint is part of the MVP. |
| DM-01 | Webhook-facing sender and recipient lookups needed supporting indexes. | Added indexes for organization sender lookup by provider service, provider phone reference, destination phone, and recipient phone hash. |
| SC-01 | Public sender responses exposed provider resource identifiers. | Public sender responses now omit provider Messaging Service and phone-number IDs. |
| SC-02 | Sender number selection exposed provider-only references to the browser. | Public sender options no longer include provider references. The server re-verifies selected numbers before provisioning. |
| SC-03 | Sender setup exposed provider number type choices that are outside the product decision Retaino already makes. | The campaign builder now asks only for sender country and number. The API searches and provisions provider-verified two-way SMS numbers only. |
| SC-04 | Public sender contracts still exposed provider name, number type, and capability details after the UI stopped asking users to choose provider-specific setup options. | Sender responses now omit provider details. Sender number search returns only phone, country, and label. Sender provisioning posts only phone and country. The API keeps provider number type and capability checks internal. |
| WH-01 | Twilio `START` and `HELP` advanced opt-out events were treated as suppressions. | Only `OptOutType=STOP` creates suppressions. `START` and `HELP` are stored as replies. |
| WH-02 | Body-based STOP fallback missed current STOP-style keywords. | STOP-style detection now covers the current standard keyword set used by the MVP. |
| WH-03 | Duplicate Twilio webhook deliveries could insert duplicate campaign message events and inflate reply, opt-out, or event counts. | Campaign message events now have a provider/message/event unique index, and event inserts ignore duplicate retries. |
| WH-04 | Inbound sender lookup accepted any matching provider reference, so mismatched webhook references could attach a reply to the wrong organization sender. | Sender lookup now requires every provided provider reference to match the same sender row. |
| TR-02 | Public redirects trusted stored target URLs at response time. | The redirect route rejects stored targets unless they parse as `http` or `https`, before recording the click. |
| TR-03 | A click-storage failure could block the recipient from reaching the booking page. | Public redirects now log click-write failures but still redirect after the stored target URL is validated. |
| TR-04 | Tracking links duplicated recipient hashes and unused click counters. | Tracking links now store only link ownership, code, target URL, and timestamps. Reports count `click_events` directly. |
| TR-05 | Public redirects accepted arbitrary path values until the database lookup. | Redirects now validate the Retaino short-code shape before the tracking-code limiter and database lookup. |
| DR-01 | A full recipient snapshot endpoint exposed more campaign recipient data than the MVP UI needed. | Removed the public recipient-list endpoint, response contract, query, tests, and web query key. The UI uses the count-only summary endpoint. |
| DR-02 | Campaign audit logs stored request IP data without a current product or compliance need. | Removed campaign audit IP storage from schema, queries, routes, tests, and generated a Drizzle migration. |
| DR-03 | The no-IP decision was applied too broadly to legal acceptance evidence. | Legal acceptances store the Cloudflare client IP for the acceptance audit trail. Campaign audit logs and click tracking still do not store IP data. |
| TA-01 | Shared campaign contracts included internal operational row schemas for recipients, tracking links, SMS messages, message events, and clicks. | Removed those schemas from the shared public contract surface. Operational return types now live in the database query layer. |
| AC-01 | Campaign and contact operational workflows were still tied to owner or admin roles after the MVP direction changed to member-accessible operations. | Organization members can now import and manage contacts, create and edit draft campaigns, set up senders, send test SMS, send live campaigns, and review reports after action-specific readiness gates pass. Organization setup, legal acceptance, billing, and team administration remain role-gated. |
| AR-01 | Campaign DB row-mapping helpers were exported only to support implementation-shape tests. | Made the mapping helpers internal and removed the private mapper tests, leaving package tests focused on public query behavior. |
| AR-02 | Campaign send processing repeated unused-credit release logic across success and failure paths. | Consolidated campaign send credit release into one local helper. |
| CI-01 | Suppressed contact imports passed through the right persistence path, but the DB upsert response still marked returned contacts as unsuppressed and accepted an unused import ID. | `upsertImportedContact` now accepts the known suppressed state, returns that state, and no longer accepts unused `contactImportId`. |

## Minor Findings Fixed

| ID | Finding | Fix |
| --- | --- | --- |
| RM-09 | Provider delivery state needed a single reporting source. | Reports use `sms_messages` for provider delivery state. Recipient status remains the send-attempt workflow state. |
| RM-10 | Tracking docs still described stale redirect behavior. | Tracking docs now describe redirecting to the stored booking URL. |
| RM-11 | Campaign UI static review found copy and layout polish items. | Campaign UI copy, placeholders, labels, query-backed filters, nested-surface risk, and report metric copy were cleaned up. |
| RM-12 | Pricing docs still described old campaign-specific SMS credit transaction types. | Pricing docs now describe the shared ledger model with `transactionType`, `source`, and `sourceId`. |
| UI-01 | One report metric mixed queued label with failed-message detail. | The report now foregrounds failed count and shows queued count as secondary detail. |
| AR-03 | The campaign form mixed guided-flow JSX with pure form state, validation, and status formatting. | Moved pure campaign form state and validation helpers into a feature-level module. |
| AR-04 | The campaign form also owned review rendering, test-SMS form behavior, and reusable SMS preview widgets. | Moved campaign review/test-SMS UI and SMS preview widgets into focused campaign components so the form module owns the guided edit flow. |
| AR-05 | Campaign DB queries mixed core campaign lifecycle queries with tracking-link and SMS-message operational queries. | Moved tracking links, click events, SMS messages, and campaign message events into a focused campaign communication query module and re-exported it from the DB package. |
| AR-06 | Campaign communication query tests still lived in the campaign lifecycle query test file after the module split. | Split communication query coverage into `campaign-communications.test.ts` and moved shared row fixtures into a test helper. |
| AR-07 | The final send route owned sender readiness, launch snapshot, credit reservation, and enqueue orchestration. | Moved final send orchestration into the campaign service so the route only maps service outcomes to HTTP responses. |
| AR-08 | The campaign form still carried low-level field controls and message-token insertion details after earlier component splits. | Moved reusable campaign field controls into `campaign-field-controls.tsx` and message insertion into a feature helper. |
| AR-09 | Sender setup mixed provisioning state with searchable country and sender-number controls. | Moved sender country and number controls into `sender-setup-controls.tsx` so `sender-setup.tsx` owns setup state and provisioning. |
| UI-02 | Sankey charts depended too heavily on SVG labels fitting in the chart area. | Increased chart label margins and removed duplicate numeric summary rows from the campaign audience step. |
| UI-03 | Campaign form placeholders and loading labels contained mojibake ellipsis characters. | Replaced corrupted characters with plain ASCII ellipses. |

## Deferred Scope Confirmed

| ID | Deferred item |
| --- | --- |
| DEF-01 | Saved reusable segments. |
| DEF-02 | Multiple audience or message variants inside one campaign. |
| DEF-03 | Journey automation and recurring sends. |
| DEF-04 | AI copy generation and experiments. |
| DEF-05 | Full inbox workflows, manual replies, assignments, and notifications. |
| DEF-06 | Booking CSV reconciliation and attribution matching. |
| DEF-07 | Booking and revenue reporting. |

## Verification

| Command | Status |
| --- | --- |
| `pnpm test` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm lint` | Passed |
| `pnpm build` | Passed |

## Remaining Review Work

Manual UI review remains owner-led by request. Agent-created browser
walkthroughs and screenshots were intentionally not performed.

The reviewed implementation, migration, test, and documentation changes were
committed in an intentional split after verification.
