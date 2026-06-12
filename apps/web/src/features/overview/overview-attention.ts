import type { OverviewResponse } from '@retaino/shared/contracts';
import { formatOverviewNumber } from './overview-format';

export type OverviewAttentionLabels = {
  answerRepliesDescription: string;
  billingAccessInactiveDescription: string;
  billingAccessInactiveTitle: string;
  billingPlanRequiredDescription: string;
  billingPlanRequiredTitle: string;
  campaignFailedDescription: string;
  campaignFailedTitle: string;
  creditsEmptyDescription: string;
  creditsEmptyTitle: string;
  creditsLowDescription: string;
  creditsLowTitle: string;
  needsReplyTitle: (count: string) => string;
  reportBookingsDescription: string;
  reportBookingsTitle: string;
  reviewFallbackDescription: string;
  reviewFallbackTitle: string;
  senderReleaseDescription: string;
  senderReleaseTitle: string;
};

export function attentionItemView(
  item: OverviewResponse['attentionItems'][number],
  overview: OverviewResponse,
  locale: string,
  labels: OverviewAttentionLabels,
) {
  if (item.id === 'needs-reply') {
    const count = formatOverviewNumber(overview.metrics.needsReplyCount, locale);

    return {
      title: labels.needsReplyTitle(count),
      description: labels.answerRepliesDescription,
    };
  }

  if (item.id === 'billing-plan-required') {
    return {
      title: labels.billingPlanRequiredTitle,
      description: labels.billingPlanRequiredDescription,
    };
  }

  if (item.id === 'billing-access-inactive') {
    return {
      title: labels.billingAccessInactiveTitle,
      description: labels.billingAccessInactiveDescription,
    };
  }

  if (item.id === 'credits-empty') {
    return {
      title: labels.creditsEmptyTitle,
      description: labels.creditsEmptyDescription,
    };
  }

  if (item.id === 'credits-low') {
    return {
      title: labels.creditsLowTitle,
      description: labels.creditsLowDescription,
    };
  }

  if (item.id === 'sender-release-scheduled') {
    return {
      title: labels.senderReleaseTitle,
      description: labels.senderReleaseDescription,
    };
  }

  if (item.id.startsWith('campaign-failed:')) {
    return {
      title: labels.campaignFailedTitle,
      description: labels.campaignFailedDescription,
    };
  }

  if (item.id.startsWith('report-bookings:')) {
    return {
      title: labels.reportBookingsTitle,
      description: labels.reportBookingsDescription,
    };
  }

  return {
    title: labels.reviewFallbackTitle,
    description: labels.reviewFallbackDescription,
  };
}
