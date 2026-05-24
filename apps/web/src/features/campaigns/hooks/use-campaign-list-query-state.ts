"use client";

import { parseAsString, useQueryStates } from 'nuqs';
import type {
  CampaignListDirection,
  CampaignListSort,
  CampaignListStatusFilter,
} from '../campaign-list-state';

export function useCampaignListQueryState() {
  const [query, setQuery] = useQueryStates({
    direction: parseAsString.withDefault('desc'),
    search: parseAsString.withDefault(''),
    sort: parseAsString.withDefault('createdAt'),
    status: parseAsString.withDefault('all'),
  });

  return [
    {
      direction: campaignListDirection(query.direction),
      search: query.search,
      sort: campaignListSort(query.sort),
      status: campaignListStatusFilter(query.status),
    },
    setQuery,
  ] as const;
}

function campaignListDirection(value: string): CampaignListDirection {
  return value === 'asc' ? 'asc' : 'desc';
}

function campaignListSort(value: string): CampaignListSort {
  if (
    value === 'createdAt' ||
    value === 'name' ||
    value === 'status' ||
    value === 'lapsedDays' ||
    value === 'updatedAt'
  ) {
    return value;
  }

  return 'createdAt';
}

function campaignListStatusFilter(value: string): CampaignListStatusFilter {
  if (
    value === 'draft' ||
    value === 'ready_to_send' ||
    value === 'sending' ||
    value === 'sent' ||
    value === 'failed'
  ) {
    return value;
  }

  return 'all';
}
