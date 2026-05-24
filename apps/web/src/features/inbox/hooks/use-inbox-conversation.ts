"use client";

import { useQuery } from '@tanstack/react-query';
import type { InboxConversationResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
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

  return useQuery({
    enabled: enabled && Boolean(organizationId && conversationId),
    queryKey: inboxQueryKeys.conversation(
      organizationId ?? 'pending',
      conversationId ?? 'pending',
    ),
    queryFn: () => {
      if (!conversationId) {
        throw new Error('Choose a conversation first.');
      }

      return api.get<InboxConversationResponse>(
        `/v1/inbox/conversations/${conversationId}`,
      );
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}
