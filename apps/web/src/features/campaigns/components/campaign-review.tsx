"use client";

import type { ReactNode } from 'react';
import type { Campaign } from '@retaino/shared/contracts';
import { createCampaignSmsPreview } from '@retaino/shared';
import { Send, UsersRound } from 'lucide-react';
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
import { MessageEstimate, MessagePreview } from './message-preview';

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
  const shouldShowReference =
    campaignReference &&
    campaignReference.toLowerCase() !== values.name.trim().toLowerCase();
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

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <div className="grid gap-1">
          <h3 className={textStyles.itemTitle}>
            {values.name || 'Not named'}
          </h3>
          {shouldShowReference ? (
            <p className={textStyles.meta}>{campaignReference}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={senderReady ? 'Sender ready' : 'Sender not ready'}
            tone={senderReady ? 'green' : 'amber'}
          />
          <StatusBadge
            icon={<UsersRound aria-hidden="true" className="size-3" />}
            label={audienceLabel}
            tone="blue"
          />
          <StatusBadge
            icon={
              estimatedCredits === null ? undefined : (
                <Send aria-hidden="true" className="size-3" />
              )
            }
            label={usageLabel}
            tone={estimatedCredits === null ? 'amber' : 'gray'}
          />
        </div>
      </section>

      {!senderReady ? (
        <ItemNotice
          description="Set up the sender before launching this campaign."
          title="Campaign is not ready to send"
          variant="warning"
        />
      ) : null}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
        <section className="grid content-start gap-4">
          <ReviewItem
            detail={audienceSummary.detail}
            label="Audience rule"
            value={audienceSummary.value}
          />

          <ReviewItem
            detail="Used as the tracked destination in each SMS."
            label="Booking link"
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

          {shouldShowReference ? (
            <ReviewItem label="Reference" value={campaignReference} />
          ) : null}

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
  value,
}: {
  detail?: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <h3 className={textStyles.itemTitle}>{label}</h3>
      <div className={cn('min-w-0', textStyles.body)}>{value}</div>
      {detail ? <p className={textStyles.meta}>{detail}</p> : null}
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
    ? `${audiencePreviewData.suppressedCount} suppressed, ${audiencePreviewData.incompleteCount} missing phone, ${audiencePreviewData.missingConsentCount} missing consent.`
    : null;

  return {
    detail: `Contacts without booking date ${
      values.audienceRule.includeNoBookingDate ? 'included' : 'excluded'
    }.${issueText ? ` ${issueText}` : ''}`,
    value: `Last booking at least ${values.audienceRule.lapsedDays} days ago`,
  };
}
