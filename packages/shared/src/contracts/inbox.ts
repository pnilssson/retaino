import { z } from 'zod';
import { idSchema, nonEmptyStringSchema, timestampSchema } from '../schemas';
import { smsMessageDirectionSchema } from './campaigns';

export const INBOX_CONVERSATION_ACTIVITY_FILTERS = [
  'all',
  'needs_reply',
] as const;
export const INBOX_REPLY_BLOCKED_REASONS = ['suppressed_phone'] as const;

export type InboxConversationActivityFilter =
  (typeof INBOX_CONVERSATION_ACTIVITY_FILTERS)[number];
export type InboxReplyBlockedReason =
  (typeof INBOX_REPLY_BLOCKED_REASONS)[number];

export const inboxConversationActivityFilterSchema = z.enum(
  INBOX_CONVERSATION_ACTIVITY_FILTERS,
);
export const inboxReplyBlockedReasonSchema = z.enum(
  INBOX_REPLY_BLOCKED_REASONS,
);

export const inboxConversationListQuerySchema = z
  .object({
    activity: inboxConversationActivityFilterSchema.default('all'),
  })
  .strict();

export const inboxConversationSummarySchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  phone: nonEmptyStringSchema,
  contactId: idSchema.nullable(),
  contactName: nonEmptyStringSchema.nullable(),
  latestCampaignId: idSchema.nullable(),
  latestCampaignName: nonEmptyStringSchema.nullable(),
  latestMessageDirection: smsMessageDirectionSchema,
  latestMessageBody: z.string(),
  latestMessageAt: timestampSchema,
  isUnread: z.boolean(),
  replyBlocked: z.boolean(),
  replyBlockedReason: inboxReplyBlockedReasonSchema.nullable(),
}).strict();

export const inboxMessageSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  organizationId: idSchema,
  direction: smsMessageDirectionSchema,
  campaignId: idSchema.nullable(),
  campaignName: nonEmptyStringSchema.nullable(),
  body: z.string(),
  status: nonEmptyStringSchema,
  sentAt: timestampSchema.nullable(),
  receivedAt: timestampSchema.nullable(),
  deliveredAt: timestampSchema.nullable(),
  failedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
}).strict();

export const inboxConversationListResponseSchema = z.object({
  conversations: z.array(inboxConversationSummarySchema),
}).strict();

export const inboxConversationResponseSchema = z.object({
  conversation: inboxConversationSummarySchema,
  messages: z.array(inboxMessageSchema),
}).strict();

export const sendInboxReplySchema = z
  .object({
    body: z.string().trim().min(1).max(1600),
    clientRequestId: idSchema,
  })
  .strict();

export const sendInboxReplyResponseSchema = z.object({
  message: inboxMessageSchema,
  conversation: inboxConversationSummarySchema,
}).strict();

export const inboxConversationReadStateResponseSchema = z.object({
  conversation: inboxConversationSummarySchema,
}).strict();

export const inboxSummaryResponseSchema = z.object({
  unreadConversationCount: z.number().int().nonnegative(),
}).strict();

export type InboxConversationListQuery = z.infer<
  typeof inboxConversationListQuerySchema
>;
export type InboxConversationSummary = z.infer<
  typeof inboxConversationSummarySchema
>;
export type InboxMessage = z.infer<typeof inboxMessageSchema>;
export type InboxConversationListResponse = z.infer<
  typeof inboxConversationListResponseSchema
>;
export type InboxConversationResponse = z.infer<
  typeof inboxConversationResponseSchema
>;
export type SendInboxReplyInput = z.infer<typeof sendInboxReplySchema>;
export type SendInboxReplyResponse = z.infer<
  typeof sendInboxReplyResponseSchema
>;
export type InboxConversationReadStateResponse = z.infer<
  typeof inboxConversationReadStateResponseSchema
>;
export type InboxSummaryResponse = z.infer<typeof inboxSummaryResponseSchema>;
