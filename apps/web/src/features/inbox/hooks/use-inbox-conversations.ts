"use client";

import { useQuery } from '@tanstack/react-query';
import type {
  InboxConversationActivityFilter,
  InboxConversationListResponse,
} from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { inboxQueryKeys } from '../inbox-query-keys';

export function useInboxConversations({
  activity,
  enabled,
  organizationId,
}: {
  activity: InboxConversationActivityFilter;
  enabled: boolean;
  organizationId: string | null;
}) {
  const api = useApi();

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: inboxQueryKeys.conversations(organizationId ?? 'pending', activity),
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization is required to load the inbox.');
      }

      return api.get<InboxConversationListResponse>(
        `/v1/inbox/conversations?activity=${activity}`,
      );
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
  });
}
