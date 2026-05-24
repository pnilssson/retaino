import type { InboxConversationActivityFilter } from '@retaino/shared/contracts';

export const inboxQueryKeys = {
  all: ['inbox'] as const,
  organization: (organizationId: string) =>
    [...inboxQueryKeys.all, organizationId] as const,
  conversations: (
    organizationId: string,
    activity: InboxConversationActivityFilter,
  ) => [...inboxQueryKeys.organization(organizationId), 'conversations', activity] as const,
  conversation: (organizationId: string, conversationId: string) =>
    [
      ...inboxQueryKeys.organization(organizationId),
      'conversation',
      conversationId,
    ] as const,
  summary: (organizationId: string) =>
    [...inboxQueryKeys.organization(organizationId), 'summary'] as const,
};
