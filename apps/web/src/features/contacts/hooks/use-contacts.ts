"use client";

import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';
import type { ContactListResponse } from '@retaino/shared/contracts';
import { useApi } from '@/hooks/use-api';
import { type ContactListQueryState } from './use-contact-list-query-state';
import { contactsQueryKeys } from '../query-keys';

const contactListPageSize = 25;

export function useContacts({
  enabled,
  organizationId,
  query,
}: {
  enabled: boolean;
  organizationId: string | null;
  query: ContactListQueryState;
}) {
  const api = useApi();

  return useQuery({
    enabled: enabled && Boolean(organizationId),
    placeholderData: keepPreviousData,
    queryKey: contactsQueryKeys.list(organizationId ?? 'pending', query),
    queryFn: () => {
      if (!organizationId) {
        throw new Error('Organization is required to load contacts.');
      }

      const params = new URLSearchParams({
        direction: query.direction,
        page: String(query.page),
        pageSize: String(contactListPageSize),
        sort: query.sort,
      });

      if (query.search) params.set('search', query.search);
      if (query.status !== 'all') params.set('status', query.status);
      if (query.issue !== 'all') params.set('issue', query.issue);

      return api.get<ContactListResponse>(`/v1/contacts?${params}`);
    },
  });
}
