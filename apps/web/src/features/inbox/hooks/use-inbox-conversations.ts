"use client";

import { useQuery } from '@tanstack/react-query';
import type {
  InboxConversationActivityFilter,
  InboxConversationListResponse,
} from '@retaino/shared/contracts';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/use-api';
import { INBOX_REFETCH_INTERVAL_MS } from '../inbox-polling';
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
  const t = useTranslations('Inbox');

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    queryKey: inboxQueryKeys.conversations(organizationId ?? 'pending', activity),
    queryFn: () => {
      if (!organizationId) {
        throw new Error(t('organizationRequiredLoadInbox'));
      }

      return api.get<InboxConversationListResponse>(
        `/v1/inbox/conversations?activity=${activity}`,
      );
    },
    staleTime: INBOX_REFETCH_INTERVAL_MS,
    refetchInterval: INBOX_REFETCH_INTERVAL_MS,
  });
}
