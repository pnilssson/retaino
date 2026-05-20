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
| WH-01 | Twilio `START` and `HELP` advanced opt-out events were treated as suppressions. | Only `OptOutType=STOP` creates suppressions. `START` and `HELP` are stored as replies. |
| WH-02 | Body-based STOP fallback missed current STOP-style keywords. | STOP-style detection now covers the current standard keyword set used by the MVP. |
| TR-02 | Public redirects trusted stored target URLs at response time. | The redirect route rejects stored targets unless they parse as `http` or `https`, before recording the click. |
| DR-01 | A full recipient snapshot endpoint exposed more campaign recipient data than the MVP UI needed. | Removed the public recipient-list endpoint, response contract, query, tests, and web query key. The UI uses the count-only summary endpoint. |
| DR-02 | Campaign audit logs stored request IP data without a current product or compliance need. | Removed campaign audit IP storage from schema, queries, routes, tests, and generated a Drizzle migration. |
| TA-01 | Shared campaign contracts included internal operational row schemas for recipients, tracking links, SMS messages, message events, and clicks. | Removed those schemas from the shared public contract surface. Operational return types now live in the database query layer. |

## Minor Findings Fixed

| ID | Finding | Fix |
| --- | --- | --- |
| RM-09 | Provider delivery state needed a single reporting source. | Reports use `sms_messages` for provider delivery state. Recipient status remains the send-attempt workflow state. |
| RM-10 | Tracking docs still described stale redirect behavior. | Tracking docs now describe redirecting to the stored booking URL. |
| RM-11 | Campaign UI static review found copy and layout polish items. | Campaign UI copy, placeholders, labels, query-backed filters, nested-surface risk, and report metric copy were cleaned up. |
| UI-01 | One report metric mixed queued label with failed-message detail. | The report now foregrounds failed count and shows queued count as secondary detail. |

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
