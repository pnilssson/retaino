# Retaino Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP Retaino Inbox so users can read inbound SMS replies and send manual SMS replies inside Retaino.

**Architecture:** The inbox is organization-scoped and threaded by SMS phone identity, not by campaign. Campaigns remain message context inside a single conversation timeline. `sms_messages` stays the canonical message ledger and source of truth for list and detail data. `sms_conversations` stores only mutable conversation state such as read position.

**Tech Stack:** Next.js App Router, Hono on Cloudflare Workers, Neon Postgres with Drizzle, Twilio Programmable Messaging through the existing provider adapter, Clerk organizations, TanStack Query, shadcn UI.

---

## Decisions

- The inbox is a must-have MVP feature because Retaino sells customer reactivation and retention, not generic mass SMS.
- The primary conversation key is `organizationId + phoneHash`.
- Conversations are not primarily campaign-linked. A customer who receives campaign 1, replies, then later receives campaign 2 has one continuous conversation.
- Campaign context is preserved per message through existing `campaignId` and `recipientId` fields.
- The default inbox view shows conversations with inbound or unread activity. An `All conversations` view shows every phone conversation that Retaino has sent to or received from.
- `Needs reply` means the latest inbound message is newer than the latest outbound message and the phone is not suppressed.
- The MVP has one shared organization inbox. Per-user assignments, internal notes, labels, and per-user read state are deferred.
- Manual replies are sent through the same SMS provider adapter and stored in `sms_messages`.
- Manual replies consume SMS credits, require an active subscription, require current legal acceptance, require a ready sender, and are blocked when the phone is suppressed.
- STOP-style replies remain handled immediately by webhook processing and create phone suppressions.
- Webhook processing stays in HTTP because Twilio expects a synchronous response, but the route must do only bounded database work.
- Inbound Twilio webhooks return empty TwiML after processing: `text/xml` with `<Response></Response>`.
- No Twilio Conversations product is used in MVP. Retaino owns the conversation model.
- There are no existing customer data migrations or backfills in scope. Retaino has no live customers yet, so implementation only works forward.

## Current Foundation

Retaino already has these pieces:

- Dedicated two-way sender per organization.
- Twilio Messaging Service provisioning with inbound and status callback URLs.
- Outbound campaign SMS rows in `sms_messages`.
- Inbound Twilio webhook route.
- Twilio webhook signature verification.
- STOP-style suppression handling.
- Campaign reports that count inbound replies.
- Provider adapter boundary for fake and Twilio SMS providers.

Important existing limitation:

- `sms_messages` currently has a unique index on `organization_id`, `campaign_id`, `recipient_id`, and `direction`. That prevents repeated inbound replies and repeated manual outbound replies in normal conversations. The inbox implementation must replace this with a safer idempotency model.

## Twilio Notes

Primary Twilio docs used for the design:

- Incoming message webhook parameters: https://www.twilio.com/docs/messaging/guides/webhook-request
- Messaging webhooks overview: https://www.twilio.com/docs/usage/webhooks/messaging-webhooks
- Message resource and `MessagingServiceSid`: https://www.twilio.com/docs/messaging/api/message-resource
- Webhook signature validation: https://www.twilio.com/docs/usage/webhooks/webhooks-security
- Advanced Opt-Out and `OptOutType`: https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out

Implementation rules:

- Continue validating Twilio webhooks from the raw request URL and raw request body.
- Continue accepting future Twilio parameters without hard-coded payload allow lists.
- Continue storing raw provider payloads in `campaign_message_events`.
- Do not send an automatic Retaino reply when Twilio already handled `STOP`, `START`, or `HELP`.
- For inbound SMS, return empty TwiML instead of JSON because Twilio expects a TwiML response from incoming message webhooks.
- MMS is deferred. If an inbound webhook includes media fields, store the text body and raw payload, ignore the media attachment, and do not fail the webhook.

## Data Model

### Modify `sms_messages`

File: `packages/db/src/schema/sms-messages.ts`

- Remove `sms_messages_campaign_recipient_direction_idx`.
- Keep `sms_messages_provider_message_idx` for provider callback idempotency.
- Add nullable `phoneHash` and `normalizedPhone` columns to store the conversation key directly on each message.
- Add nullable `idempotencyKey` with a unique partial index on `organization_id` and `idempotency_key` where the key is not null.
- Add an index for inbox timeline reads:
  - `organization_id`, `phone_hash`, `created_at`
- Add an index for contact-based message lookup:
  - `organization_id`, `contact_id`, `created_at`

Rationale:

- The existing unique index encodes campaign-send idempotency into the message ledger. That is too restrictive for conversations.
- Campaign send idempotency moves to `idempotencyKey`, using `campaign-send:{campaignId}:recipient:{recipientId}`.
- Manual reply idempotency uses a client-generated `clientRequestId` in the reply request and stores `manual-reply:{conversationId}:{clientRequestId}`.

### Create `sms_conversations`

File: `packages/db/src/schema/sms-conversations.ts`

This table is conversation state, not a full conversation projection. The name stays `sms_conversations` because it is the database concept for an inbox thread.

Columns:

- `id uuid primary key defaultRandom`
- `organizationId uuid not null`
- `phoneHash text not null`
- `normalizedPhone text not null`
- `lastReadAt timestamp with time zone null`
- `createdAt`
- `updatedAt`

Indexes:

- Unique: `organization_id`, `phone_hash`

Rationale:

- The message ledger should remain the source of truth for conversation list and detail data in MVP.
- Storing only mutable state avoids sync drift between messages, contacts, suppressions, and conversations.
- Unread state is derived from inbound messages newer than `lastReadAt`.
- Suppression state comes from the existing `suppressions` table, not from duplicated conversation columns.
- If inbox list aggregation becomes slow with real usage, Retaino can later add a projection table backed by measured need.

### Migration

Do not manually edit SQL or migration metadata.

Implementation command:

```powershell
pnpm --filter @retaino/db db:generate
```

Then review the generated migration for shape only. Do not hand edit it.

## Shared Contracts

File: `packages/shared/src/contracts/inbox.ts`

Add schemas and types:

- `inboxConversationListFilterSchema`
- `inboxConversationSummarySchema`
- `inboxConversationListResponseSchema`
- `inboxMessageSchema`
- `inboxConversationResponseSchema`
- `sendInboxReplySchema`
- `sendInboxReplyResponseSchema`
- `markInboxConversationReadResponseSchema`

Response design:

```ts
type InboxConversationListResponse = {
  conversations: InboxConversationSummary[];
};

type InboxConversationResponse = {
  conversation: InboxConversationSummary;
  messages: InboxMessage[];
};

type SendInboxReplyResponse = {
  message: InboxMessage;
  conversation: InboxConversationSummary;
};
```

`sendInboxReplySchema` includes:

- `body`: trimmed non-empty string, max 1600 characters.
- `clientRequestId`: UUID generated by the web app before submit.

Public contracts must not expose provider sender IDs, Twilio SIDs, raw webhook payloads, or internal provider terms.

File: `packages/shared/src/contracts/index.ts`

- Export `./inbox`.

Tests:

- Create `packages/shared/test/contracts/inbox.test.ts`.
- Validate list, detail, reply request, and reply response payloads.
- Validate that reply body is trimmed and non-empty.
- Validate that provider fields are not part of the public response.

## Database Queries

File: `packages/db/src/queries/inbox.ts`

Add query helpers:

- `upsertSmsConversationForMessage`
- `listInboxConversations`
- `getInboxConversationById`
- `getInboxConversationByPhoneHash`
- `listInboxMessages`
- `markInboxConversationRead`
- `createManualReplySmsMessage`
- `recordManualReplyProviderResult`

Rules:

- Every query takes `organizationId`.
- Never load or mutate a conversation by ID alone.
- `listInboxConversations` supports:
  - `activity=inbound`
  - `activity=unread`
  - `activity=all`
- `activity=inbound` means the latest inbound message is newer than the latest outbound message and the phone is not suppressed.
- Message list orders oldest to newest inside a conversation.
- Conversation list orders newest first.
- `listInboxConversations` derives latest message preview, latest message time, latest campaign context, and unread count from `sms_messages`.
- `listInboxConversations` checks suppressions to tell the web app whether replies are blocked.
- `markInboxConversationRead` sets `lastReadAt` to the latest message timestamp in the conversation.

Update existing file:

File: `packages/db/src/queries/campaign-communications.ts`

- After creating inbound SMS, ensure the conversation state row exists.
- After creating outbound campaign SMS, ensure the conversation state row exists.
- Remove the assumption that outbound messages are unique by campaign recipient and direction for all future send types.
- Preserve campaign-send idempotency for campaign sends.

Tests:

- Add `packages/db/test/schema/sms-conversations.test.ts`.
- Extend `packages/db/test/schema/sms-messages.test.ts` to cover the new indexes and removed uniqueness rule.
- Add `packages/db/test/queries/inbox.test.ts`.
- Extend `packages/db/test/queries/campaign-communications.test.ts` for repeated inbound replies from the same phone.
- Add tests proving unread count is derived from inbound messages newer than `lastReadAt`.

## API

Create feature folder:

- `apps/api/src/features/inbox/inbox.routes.ts`
- `apps/api/src/features/inbox/inbox.service.ts`

Routes:

- `GET /v1/inbox/conversations`
- `GET /v1/inbox/conversations/:id`
- `POST /v1/inbox/conversations/:id/read`
- `POST /v1/inbox/conversations/:id/replies`

Service responsibilities:

- Resolve organization from auth context only.
- Validate request bodies with shared schemas.
- Load sender readiness before manual replies.
- Check active subscription and SMS credit balance before manual replies.
- Check current legal acceptance before manual replies.
- Check phone suppression before manual replies.
- Render no campaign appendices for manual replies. The user-authored reply is sent as written, subject to SMS length and compliance checks.
- Estimate SMS segments and debit credits before provider send.
- Release credits if provider send fails before the message is accepted.
- Store the outbound reply before provider send with status `queued`.
- Use `clientRequestId` to make retrying the same manual reply idempotent.
- Update provider IDs and status after provider send returns.
- Match later status callbacks by `providerMessageId`. Do not rely on Twilio returning Retaino's internal `reference`.

Manual reply user-facing errors:

- `Conversation was not found.`
- `This phone number cannot receive replies.`
- `Set up the SMS sender before replying.`
- `An active subscription is required before sending SMS.`
- `SMS credit balance is too low.`
- `Message cannot be empty.`

Server registration:

File: `apps/api/src/server.ts`

- Import `inboxRoutes`.
- Register `app.route('/v1/inbox', inboxRoutes)` after authenticated middleware.

Tests:

- Create `apps/api/test/features/inbox/inbox.routes.test.ts`.
- Create `apps/api/test/features/inbox/inbox.service.test.ts`.
- Cover auth-scoped list, detail, read, reply success, sender-not-ready, suppressed phone, missing subscription, insufficient credits, and provider failure release.

## Twilio Webhooks

Update:

File: `apps/api/src/features/sms/sms.webhook-routes.ts`

- Ensure inbound messages always ensure the phone-threaded conversation state row exists.
- Keep matching the latest campaign recipient by phone hash so campaign context is attached to inbound replies.
- Keep STOP-style suppression handling before returning success.
- If the sender cannot be matched, log or track the ignored state internally and still return empty TwiML.
- Ignore inbound media attachments for MVP while preserving the raw webhook payload.
- Return `text/xml` with `<Response></Response>` after bounded writes.

Provider adapter:

File: `apps/api/src/lib/sms-provider.ts`

- Use the existing outbound send input and set `reference` to the manual reply idempotency key for Retaino's internal logs.
- Do not depend on Twilio returning the internal `reference` in status callbacks.
- Keep Twilio-specific fields behind the adapter.

File: `apps/api/src/lib/twilio-provider.ts`

- Continue sending replies with `MessagingServiceSid`.
- Continue passing `StatusCallback`.
- Do not use TwiML replies from the inbound webhook for manual replies.
- Parse inbound media fields only enough to avoid failing webhooks that include media. Full MMS handling is deferred.

Tests:

- Extend `apps/api/test/features/sms/sms.webhook-routes.test.ts` to prove repeated replies append to the same conversation.
- Keep existing webhook signature tests.

## Web App

Routes:

- Create `apps/web/src/app/(app)/app/inbox/page.tsx`.
- Add `routes.inbox = '/app/inbox'` in `apps/web/src/lib/routes.ts`.
- Add Inbox sidebar item in `apps/web/src/features/appshell/components/app-sidebar.tsx` with a suitable lucide icon.

Feature folder:

- `apps/web/src/features/inbox/inbox-query-keys.ts`
- `apps/web/src/features/inbox/inbox-format.ts`
- `apps/web/src/features/inbox/hooks/use-inbox-conversations.ts`
- `apps/web/src/features/inbox/hooks/use-inbox-conversation.ts`
- `apps/web/src/features/inbox/hooks/use-send-inbox-reply.ts`
- `apps/web/src/features/inbox/hooks/use-mark-inbox-conversation-read.ts`
- `apps/web/src/features/inbox/components/inbox-screen.tsx`
- `apps/web/src/features/inbox/components/inbox-conversation-list.tsx`
- `apps/web/src/features/inbox/components/inbox-conversation-thread.tsx`
- `apps/web/src/features/inbox/components/inbox-reply-form.tsx`
- `apps/web/src/features/inbox/components/inbox-empty-state.tsx`

UI rules:

- Do not use cards inside cards.
- Use a split layout: conversation list on the left, thread on the right.
- On mobile, show list first and open the thread as the active view.
- Default filter is `Needs reply`.
- Add filter control for:
  - `Needs reply`
  - `Unread`
  - `All conversations`
- Show campaign context as small neutral metadata on messages, not as the primary thread grouping.
- Disable the reply box for suppressed conversations.
- Use TanStack Form for the reply form.
- Use TanStack Query polling first. Recommended stale time is 10 seconds for inbox list and active thread.

No tests should be added under `apps/web`.

Web verification after implementation:

```powershell
pnpm --filter @retaino/web typecheck
pnpm --filter @retaino/web lint
pnpm --filter @retaino/web contrast:check
pnpm --filter @retaino/web ui:audit
```

## Notifications

MVP notification behavior:

- Sidebar shows an unread count badge for the shared organization inbox.
- Inbox list shows unread count per conversation.
- Active thread is marked read when opened or when the user clicks a read action.
- No email notifications.
- No browser push notifications.
- No real-time WebSocket channel.

Implementation:

- Add `GET /v1/inbox/conversations?activity=unread` support.
- Add `GET /v1/inbox/summary` for the sidebar unread badge.
- The summary returns the count of conversations with inbound messages newer than `lastReadAt`.

## Compliance And Safety

- Continue suppressing STOP-style replies immediately.
- Block manual replies to suppressed phone numbers.
- Do not expose provider IDs in public contracts.
- Do not store request IPs for provider callbacks.
- Keep raw webhook payloads only in event tables as already designed.
- Do not import or display unsupported sensitive data in inbox.
- Keep customer-facing copy focused on outcomes and next actions, not provider implementation.
- Manual replies must make SMS credit usage visible enough to avoid surprise credit depletion.

## Implementation Tasks

### Task 1: Contracts

**Files:**

- Create `packages/shared/src/contracts/inbox.ts`
- Modify `packages/shared/src/contracts/index.ts`
- Test `packages/shared/test/contracts/inbox.test.ts`

- [ ] Add inbox Zod schemas and exported TypeScript types.
- [ ] Export inbox contracts from `packages/shared/src/contracts/index.ts`.
- [ ] Add contract tests for list, detail, read, and reply payloads.
- [ ] Run `pnpm --filter @retaino/shared test`.
- [ ] Run `pnpm --filter @retaino/shared typecheck`.

### Task 2: Schema

**Files:**

- Create `packages/db/src/schema/sms-conversations.ts`
- Modify `packages/db/src/schema/sms-messages.ts`
- Modify `packages/db/src/schema/index.ts`
- Test `packages/db/test/schema/sms-conversations.test.ts`
- Test `packages/db/test/schema/sms-messages.test.ts`

- [ ] Add the `sms_conversations` schema.
- [ ] Add message indexes needed by inbox timeline reads.
- [ ] Remove the campaign-recipient-direction uniqueness rule.
- [ ] Export the new schema.
- [ ] Add schema tests.
- [ ] Run `pnpm --filter @retaino/db test -- schema`.

### Task 3: Migration

**Files:**

- Generate Drizzle migration under `packages/db/migrations`

- [ ] Run `pnpm --filter @retaino/db db:generate`.
- [ ] Review generated SQL for expected table, indexes, and removed unique index.
- [ ] Do not manually edit generated migration SQL or metadata.
- [ ] Run `pnpm --filter @retaino/db typecheck`.

### Task 4: Conversation Queries

**Files:**

- Create `packages/db/src/queries/inbox.ts`
- Modify `packages/db/src/queries/index.ts`
- Modify `packages/db/src/queries/campaign-communications.ts`
- Test `packages/db/test/queries/inbox.test.ts`
- Test `packages/db/test/queries/campaign-communications.test.ts`

- [ ] Implement conversation state upsert for inbound and outbound messages.
- [ ] Implement conversation list, detail, message list, read mutation, and manual reply row creation.
- [ ] Preserve organization scoping on every query.
- [ ] Update campaign communication helpers to maintain conversations.
- [ ] Add tests for repeated inbound replies from the same phone.
- [ ] Add tests for campaign 1 plus campaign 2 messages appearing in one phone conversation.
- [ ] Add tests for unread state derived from `lastReadAt`.
- [ ] Run `pnpm --filter @retaino/db test`.

### Task 5: API Service

**Files:**

- Create `apps/api/src/features/inbox/inbox.service.ts`
- Test `apps/api/test/features/inbox/inbox.service.test.ts`

- [ ] Implement list, detail, mark-read, and manual reply service functions.
- [ ] Reuse billing credit debit and release helpers.
- [ ] Reuse sender readiness and legal readiness checks.
- [ ] Reuse provider adapter for manual replies.
- [ ] Block replies to suppressed phones.
- [ ] Add service tests for success and all expected failure states.
- [ ] Run `pnpm --filter @retaino/api test -- inbox.service`.

### Task 6: API Routes

**Files:**

- Create `apps/api/src/features/inbox/inbox.routes.ts`
- Modify `apps/api/src/server.ts`
- Test `apps/api/test/features/inbox/inbox.routes.test.ts`

- [ ] Add authenticated inbox routes.
- [ ] Parse and validate query strings and request bodies with shared schemas.
- [ ] Convert service failure states to structured API errors.
- [ ] Register routes in the API server.
- [ ] Add route tests.
- [ ] Run `pnpm --filter @retaino/api test -- inbox`.

### Task 7: Web Inbox

**Files:**

- Create `apps/web/src/app/(app)/app/inbox/page.tsx`
- Modify `apps/web/src/lib/routes.ts`
- Modify `apps/web/src/features/appshell/components/app-sidebar.tsx`
- Create the `apps/web/src/features/inbox` files listed above

- [ ] Add route and sidebar navigation.
- [ ] Add inbox query keys and hooks.
- [ ] Build the split inbox screen.
- [ ] Build the conversation list with filters.
- [ ] Build the conversation thread timeline.
- [ ] Build the TanStack Form reply box.
- [ ] Disable replies for suppressed conversations.
- [ ] Add unread badge behavior.
- [ ] Run `pnpm --filter @retaino/web typecheck`.
- [ ] Run `pnpm --filter @retaino/web lint`.
- [ ] Run `pnpm --filter @retaino/web contrast:check`.
- [ ] Run `pnpm --filter @retaino/web ui:audit`.

### Task 8: Webhook Integration

**Files:**

- Modify `apps/api/src/features/sms/sms.webhook-routes.ts`
- Modify `apps/api/test/features/sms/sms.webhook-routes.test.ts`

- [ ] Ensure inbound webhook writes ensure the conversation state row exists.
- [ ] Ensure STOP replies suppress the phone and block replies through suppression checks.
- [ ] Ensure unknown senders are still ignored safely.
- [ ] Ensure repeated inbound replies do not violate uniqueness constraints.
- [ ] Run `pnpm --filter @retaino/api test -- sms.webhook-routes`.

### Task 9: End-to-End Verification

Commands:

```powershell
pnpm --filter @retaino/shared test
pnpm --filter @retaino/db test
pnpm --filter @retaino/api test
pnpm --filter @retaino/shared typecheck
pnpm --filter @retaino/db typecheck
pnpm --filter @retaino/api typecheck
pnpm --filter @retaino/web typecheck
pnpm --filter @retaino/web lint
pnpm --filter @retaino/web contrast:check
pnpm --filter @retaino/web ui:audit
```

Manual verification:

- Send a campaign to a test phone.
- Confirm the outbound campaign message creates or updates one inbox conversation.
- Send two inbound replies from the same phone.
- Confirm both replies appear in the same thread.
- Send a second campaign to the same phone.
- Confirm the second campaign message appears in the same thread with campaign context.
- Reply manually from Retaino.
- Confirm the reply is sent through Twilio and appears in the thread.
- Send `STOP` from the phone.
- Confirm the phone is suppressed and the reply box is disabled.

## Deferred

- Per-user read state.
- Assignments.
- Internal notes.
- Labels.
- SLA timers.
- Browser push notifications.
- Email notifications.
- Real-time WebSocket updates.
- MMS.
- Twilio Conversations.
- Cross-channel inbox for email, WhatsApp, or RCS.
