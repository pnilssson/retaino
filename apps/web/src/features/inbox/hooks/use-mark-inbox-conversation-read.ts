"use client";

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { MarkInboxConversationReadResponse } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';
import { inboxQueryKeys } from '../inbox-query-keys';

export function useMarkInboxConversationRead({
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
    mutationFn: () => {
      if (!conversationId) {
        throw new Error(t('chooseConversationFirst'));
      }

      return api.post<MarkInboxConversationReadResponse>(
        `/v1/inbox/conversations/${conversationId}/read`,
        {},
      );
    },
    onSuccess: async (response) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(
        inboxQueryKeys.conversation(organizationId, response.conversation.id),
        (current: unknown) =>
          current && typeof current === 'object'
            ? { ...current, conversation: response.conversation }
            : current,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: inboxQueryKeys.organization(organizationId),
        }),
      ]);
    },
  });
}
