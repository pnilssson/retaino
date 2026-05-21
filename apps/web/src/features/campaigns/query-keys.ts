"use client";

import type { CampaignAudienceRule } from '@retaino/shared/contracts';

export const campaignsQueryKeys = {
  all: ['campaigns'] as const,
  organization: (organizationId: string) =>
    [...campaignsQueryKeys.all, organizationId] as const,
  detail: (organizationId: string, campaignId: string) =>
    [...campaignsQueryKeys.organization(organizationId), campaignId] as const,
  recipientSummary: (organizationId: string, campaignId: string) =>
    [
      ...campaignsQueryKeys.organization(organizationId),
      campaignId,
      'recipients',
      'summary',
    ] as const,
  report: (organizationId: string, campaignId: string) =>
    [
      ...campaignsQueryKeys.organization(organizationId),
      campaignId,
      'report',
    ] as const,
  list: (organizationId: string) =>
    [...campaignsQueryKeys.organization(organizationId), 'list'] as const,
  audiencePreview: (
    organizationId: string,
    audienceRule: CampaignAudienceRule,
  ) =>
    [
      ...campaignsQueryKeys.organization(organizationId),
      'audience-preview',
      {
        includeNoBookingDate: audienceRule.includeNoBookingDate,
        lapsedDays: audienceRule.lapsedDays,
      },
    ] as const,
};
