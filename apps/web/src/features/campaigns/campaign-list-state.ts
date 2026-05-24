import type { CampaignStatus } from '@retaino/shared/contracts';

export type CampaignListStatusFilter = CampaignStatus | 'all';
export type CampaignListSort =
  | 'createdAt'
  | 'lapsedDays'
  | 'name'
  | 'status'
  | 'updatedAt';
export type CampaignListDirection = 'asc' | 'desc';
