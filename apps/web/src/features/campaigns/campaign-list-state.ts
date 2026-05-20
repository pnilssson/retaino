import type { CampaignStatus } from '@retaino/shared/contracts';

export type CampaignListStatusFilter = CampaignStatus | 'all';
export type CampaignListSort = 'createdAt' | 'name' | 'status' | 'lapsedDays';
export type CampaignListDirection = 'asc' | 'desc';
