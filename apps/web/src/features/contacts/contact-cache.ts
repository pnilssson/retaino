"use client";

import type { QueryClient } from '@tanstack/react-query';
import { campaignsQueryKeys } from '@/features/campaigns/query-keys';
import { contactsQueryKeys } from './query-keys';

export async function invalidateContactDependentQueries(
  queryClient: QueryClient,
  organizationId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: contactsQueryKeys.organization(organizationId),
    }),
    queryClient.invalidateQueries({
      queryKey: campaignsQueryKeys.audiencePreviews(organizationId),
    }),
  ]);
}
