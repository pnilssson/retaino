"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  INBOX_CONVERSATION_ACTIVITY_FILTERS,
  type InboxConversationResponse,
  type InboxConversationListResponse,
  type InboxConversationReadStateResponse,
  type InboxConversationSummary,
} from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { inboxQueryKeys } from '../inbox-query-keys';

export function useSetInboxConversationReadState({
  organizationId,
}: {
  organizationId: string | null;
}) {
  const api = useApi();
  const t = useTranslations('Inbox');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      read,
    }: {
      conversationId: string;
      read: boolean;
    }) =>
      api.post<InboxConversationReadStateResponse>(
        `/v1/inbox/conversations/${conversationId}/${read ? 'read' : 'unread'}`,
        {},
      ),
    onError: (error) => {
      toast.error(t('readStateErrorTitle'), {
        description:
          error instanceof Error ? error.message : t('readStateErrorDescription'),
      });
    },
    onSuccess: async (response) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(
        inboxQueryKeys.conversation(organizationId, response.conversation.id),
        (current: InboxConversationResponse | undefined) =>
          current
            ? { ...current, conversation: response.conversation }
            : current,
      );

      for (const activity of INBOX_CONVERSATION_ACTIVITY_FILTERS) {
        queryClient.setQueryData(
          inboxQueryKeys.conversations(organizationId, activity),
          (current: InboxConversationListResponse | undefined) =>
            current
              ? replaceConversationInList(current, response.conversation)
              : current,
        );
      }

      await queryClient.invalidateQueries({
        queryKey: inboxQueryKeys.organization(organizationId),
      });
    },
  });
}

function replaceConversationInList(
  response: InboxConversationListResponse,
  conversation: InboxConversationSummary,
): InboxConversationListResponse {
  return {
    ...response,
    conversations: response.conversations.map((item) =>
      item.id === conversation.id ? conversation : item,
    ),
  };
}
