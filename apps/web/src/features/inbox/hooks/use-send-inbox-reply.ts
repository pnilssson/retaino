"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  SendInboxReplyInput,
  SendInboxReplyResponse,
} from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';
import { inboxQueryKeys } from '../inbox-query-keys';

export function useSendInboxReply({
  conversationId,
  organizationId,
}: {
  conversationId: string | null;
  organizationId: string | null;
}) {
  const api = useApi();
  const t = useTranslations('Inbox');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendInboxReplyInput) => {
      if (!conversationId) {
        throw new Error(t('chooseConversationFirst'));
      }

      return api.post<SendInboxReplyResponse>(
        `/v1/inbox/conversations/${conversationId}/replies`,
        input,
      );
    },
    onSuccess: async (response) => {
      if (!organizationId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: inboxQueryKeys.conversation(
            organizationId,
            response.conversation.id,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: inboxQueryKeys.organization(organizationId),
        }),
      ]);
    },
  });
}
