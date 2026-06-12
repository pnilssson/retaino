"use client";

import { useQuery } from '@tanstack/react-query';
import type { InboxConversationResponse } from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';
import { INBOX_REFETCH_INTERVAL_MS } from '../inbox-polling';
import { inboxQueryKeys } from '../inbox-query-keys';

export function useInboxConversation({
  conversationId,
  enabled,
  organizationId,
}: {
  conversationId: string | null;
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();
  const t = useTranslations('Inbox');

  return useQuery({
    enabled: enabled && Boolean(organizationId && conversationId),
    queryKey: inboxQueryKeys.conversation(
      organizationId ?? 'pending',
      conversationId ?? 'pending',
    ),
    queryFn: () => {
      if (!conversationId) {
        throw new Error(t('chooseConversationFirst'));
      }

      return api.get<InboxConversationResponse>(
        `/v1/inbox/conversations/${conversationId}`,
      );
    },
    staleTime: INBOX_REFETCH_INTERVAL_MS,
    refetchInterval: INBOX_REFETCH_INTERVAL_MS,
  });
}
