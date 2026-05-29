"use client";

import type { ReactNode } from 'react';
import type { Campaign } from '@retaino/shared/contracts';
import { createCampaignSmsPreview } from '@retaino/shared';
import {
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { InfoTooltip } from '@/components/info-tooltip';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import {
  campaignSendStatusText,
  isPreviewableAudienceRule,
  type CampaignFormValues,
} from '../campaign-form-state';
import { useCampaignAudiencePreview } from '../hooks/use-campaign-audience-preview';
import { useCampaignRecipientSummary } from '../hooks/use-campaign-recipient-summary';
import {
  MessageEstimate,
  MessagePreview,
} from './message-preview';

export function CampaignReview({
  campaign,
  organizationId,
  senderReady,
  values,
}: {
  campaign: Campaign | null;
  organizationId: string | null;
  senderReady: boolean;
  values: CampaignFormValues;
}) {
  const campaignId = campaign?.id ?? null;
  const audiencePreview = useCampaignAudiencePreview({
    audienceRule: values.audienceRule,
    enabled:
      (!campaign || campaign.status === 'draft') &&
      isPreviewableAudienceRule(values.audienceRule),
    organizationId,
  });
  const recipientSummary = useCampaignRecipientSummary({
    campaignId,
    enabled: Boolean(campaign && campaign.status !== 'draft'),
    organizationId,
  });
  const smsPreview = createCampaignSmsPreview({ smsBody: values.smsBody });
  const frozenRecipientCount = recipientSummary.data?.recipientCount ?? null;
  const eligibleCount = audiencePreview.data?.eligibleCount ?? null;
  const usageRecipientCount =
    campaign && campaign.status !== 'draft' ? frozenRecipientCount : eligibleCount;
  const estimatedCredits =
    usageRecipientCount === null
      ? null
      : usageRecipientCount * smsPreview.estimatedSmsPerRecipient;
  const campaignReference = values.campaignCode.trim();
  const referenceValue =
    campaignReference &&
    campaignReference.toLowerCase() !== values.name.trim().toLowerCase()
      ? campaignReference
      : 'Not added';
  const audienceLabel =
    usageRecipientCount === null
      ? 'Audience unavailable'
      : `${usageRecipientCount} ${
          usageRecipientCount === 1 ? 'recipient' : 'recipients'
        }`;
  const usageLabel =
    estimatedCredits === null
      ? 'Usage unavailable'
      : `Up to ${estimatedCredits} ${
          estimatedCredits === 1 ? 'credit' : 'credits'
        }`;
  const audienceSummary = audienceReviewSummary({
    audiencePreviewData: audiencePreview.data,
    campaign,
    eligibleCount,
    frozenRecipientCount,
    isAudienceLoading: audiencePreview.isLoading,
    isRecipientSummaryLoading: recipientSummary.isLoading,
    values,
  });
  const selectedCampaignsExcludedCount =
    audiencePreview.data?.selectedCampaignsExcludedCount ?? 0;
  const selectedCampaignNames =
    audiencePreview.data?.excludedCampaigns
      .filter((campaign) => campaign.excludedCount > 0)
      .map((campaign) => campaign.name)
      .join(', ') ?? '';

  return (
    <div className="grid gap-6">
      <section className="flex flex-wrap gap-2">
        <StatusBadge
          label={senderReady ? 'Sender ready' : 'Sender not ready'}
          tone={senderReady ? 'green' : 'amber'}
        />
        <StatusBadge
          icon={
            usageRecipientCount === null ? undefined : (
              <UserCheck aria-hidden="true" className="size-3" />
            )
          }
          label={audienceLabel}
          tone={usageRecipientCount === null ? 'amber' : 'primary'}
        />
        {selectedCampaignsExcludedCount > 0 ? (
          <StatusBadge
            label={`${selectedCampaignsExcludedCount} already received selected campaigns`}
            tone="amber"
          />
        ) : null}
        <StatusBadge
          icon={
            estimatedCredits === null ? undefined : (
              <DollarSign aria-hidden="true" className="size-3" />
            )
          }
          label={usageLabel}
          tone={estimatedCredits === null ? 'amber' : 'primary'}
        />
      </section>

      {!senderReady ? (
        <ItemNotice
          description="Set up the sender before launching this campaign."
          title="Campaign is not ready to send"
          variant="warning"
        />
      ) : null}

      {selectedCampaignsExcludedCount > 0 ? (
        <ItemNotice
          description={`${selectedCampaignsExcludedCount} people already received ${
            selectedCampaignNames || 'the selected campaigns'
          } and will be excluded.`}
          title="Previous campaign recipients will be skipped"
          variant="warning"
        />
      ) : null}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
        <section className="grid content-start gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ReviewItem
              label="Booking link"
              tooltip="Booking page recipients will reach."
              value={
                values.bookingUrl ? (
                  <a
                    className={cn(
                      'break-words underline underline-offset-4',
                      textStyles.body,
                    )}
                    href={values.bookingUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {values.bookingUrl}
                  </a>
                ) : (
                  'Not added'
                )
              }
            />
            <ReviewItem label="Reference" value={referenceValue} />
          </div>

          <ReviewItem
            detail={audienceSummary.detail}
            label="Audience rule"
            value={audienceSummary.value}
          />

          {campaign && campaign.status !== 'draft' ? (
            <ReviewItem
              label="Send status"
              value={campaignSendStatusText(campaign)}
            />
          ) : null}
        </section>

        <section className="grid content-start gap-3">
          <h3 className={textStyles.itemTitle}>Message preview</h3>
          <MessagePreview showLabel={false} smsBody={values.smsBody} />
          <MessageEstimate smsBody={values.smsBody} />
        </section>
      </div>
    </div>
  );
}

function ReviewItem({
  detail,
  label,
  tooltip,
  value,
}: {
  detail?: ReactNode;
  label: string;
  tooltip?: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-1.5">
        <h3 className={textStyles.itemTitle}>{label}</h3>
        {tooltip ? (
          <InfoTooltip label={`${label} details`}>{tooltip}</InfoTooltip>
        ) : null}
      </div>
      <div className={cn('min-w-0', textStyles.body)}>{value}</div>
      {typeof detail === 'string' ? (
        <p className={textStyles.meta}>{detail}</p>
      ) : (
        detail
      )}
    </div>
  );
}

function audienceReviewSummary({
  audiencePreviewData,
  campaign,
  eligibleCount,
  frozenRecipientCount,
  isAudienceLoading,
  isRecipientSummaryLoading,
  values,
}: {
  audiencePreviewData:
    | {
        incompleteCount: number;
        missingConsentCount: number;
        recentCampaignExcludedCount: number;
        selectedCampaignsExcludedCount: number;
        suppressedCount: number;
      }
    | undefined;
  campaign: Campaign | null;
  eligibleCount: number | null;
  frozenRecipientCount: number | null;
  isAudienceLoading: boolean;
  isRecipientSummaryLoading: boolean;
  values: CampaignFormValues;
}) {
  if (campaign && campaign.status !== 'draft') {
    if (frozenRecipientCount === null) {
      return {
        detail: undefined,
        value: isRecipientSummaryLoading
          ? 'Loading selected recipients.'
          : 'Selected recipients unavailable.',
      };
    }

    return {
      detail: undefined,
      value: 'Selected when this campaign was prepared.',
    };
  }

  if (isAudienceLoading) {
    return {
      detail: undefined,
      value: 'Checking eligible contacts.',
    };
  }

  if (eligibleCount === null) {
    return {
      detail: undefined,
      value: 'Eligible contacts unavailable.',
    };
  }

  const issueText = audiencePreviewData
    ? (
        <AudienceRuleDetailBadges
          audiencePreviewData={audiencePreviewData}
        />
      )
    : null;

  return {
    detail: issueText,
    value: `Last booking at least ${
      values.audienceRule.lapsedDays
    } days ago. Contacts without a booking date are ${
      values.audienceRule.includeNoBookingDate ? 'included' : 'excluded'
    }.`,
  };
}

function AudienceRuleDetailBadges({
  audiencePreviewData,
}: {
  audiencePreviewData: {
    incompleteCount: number;
    missingConsentCount: number;
    recentCampaignExcludedCount: number;
    selectedCampaignsExcludedCount: number;
    suppressedCount: number;
  };
}) {
  const badges = [
    {
      count: audiencePreviewData.suppressedCount,
      label: `${audiencePreviewData.suppressedCount} suppressed`,
    },
    {
      count: audiencePreviewData.incompleteCount,
      label: `${audiencePreviewData.incompleteCount} missing phone`,
    },
    {
      count: audiencePreviewData.missingConsentCount,
      label: `${audiencePreviewData.missingConsentCount} missing consent`,
    },
    {
      count: audiencePreviewData.recentCampaignExcludedCount,
      label: `${audiencePreviewData.recentCampaignExcludedCount} recently contacted`,
    },
    {
      count: audiencePreviewData.selectedCampaignsExcludedCount,
      label: `${audiencePreviewData.selectedCampaignsExcludedCount} already received selected campaigns`,
    },
  ] as const;

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {badges.map((badge) => (
        <StatusBadge
          key={badge.label}
          label={badge.label}
          showIcon={false}
          tone={badge.count && badge.count > 0 ? 'amber' : 'gray'}
        />
      ))}
    </div>
  );
}
