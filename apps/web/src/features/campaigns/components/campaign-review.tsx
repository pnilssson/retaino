"use client";

import type { ReactNode } from 'react';
import type { Campaign } from '@retaino/shared/contracts';
import { createCampaignSmsPreview } from '@retaino/shared';
import {
  DollarSign,
  UserCheck,
} from 'lucide-react';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
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
  const locale = useLocale();
  const t = useTranslations('Campaigns');
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
      : t('notAdded');
  const audienceLabel =
    usageRecipientCount === null
      ? t('audienceUnavailable')
      : `${usageRecipientCount} ${t(
          usageRecipientCount === 1 ? 'recipient' : 'recipients',
        )}`;
  const usageLabel =
    estimatedCredits === null
      ? t('usageUnavailable')
      : t(estimatedCredits === 1 ? 'upToCredit' : 'upToCredits', {
          count: estimatedCredits,
        });
  const audienceSummary = audienceReviewSummary({
    audiencePreviewData: audiencePreview.data,
    campaign,
    eligibleCount,
    frozenRecipientCount,
    isAudienceLoading: audiencePreview.isLoading,
    isRecipientSummaryLoading: recipientSummary.isLoading,
    t,
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
          label={senderReady ? t('senderReady') : t('senderNotReady')}
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
            label={t('alreadyReceivedSelectedCampaigns', {
              count: selectedCampaignsExcludedCount,
            })}
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
          description={t('campaignNotReadyDescription')}
          title={t('campaignNotReadyTitle')}
          variant="warning"
        />
      ) : null}

      {selectedCampaignsExcludedCount > 0 ? (
        <ItemNotice
          description={t('previousRecipientsSkippedDescription', {
            count: selectedCampaignsExcludedCount,
            campaigns: selectedCampaignNames || t('selectedCampaignsFallback'),
          })}
          title={t('previousRecipientsSkippedTitle')}
          variant="warning"
        />
      ) : null}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
        <section className="grid content-start gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ReviewItem
              label={t('bookingLink')}
              tooltipLabel={t('bookingLinkDetails')}
              tooltip={t('bookingPageTooltip')}
              value={
                values.bookingUrl ? (
                  <a
                    className={cn(
                      'break-words underline underline-offset-4',
                      textStyles.p,
                    )}
                    href={values.bookingUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {values.bookingUrl}
                  </a>
                ) : (
                  t('notAdded')
                )
              }
            />
            <ReviewItem label={t('reference')} value={referenceValue} />
          </div>

          <ReviewItem
            detail={audienceSummary.detail}
            label={t('audienceRule')}
            value={audienceSummary.value}
          />

          {campaign && campaign.status !== 'draft' ? (
            <ReviewItem
              label={t('sendStatus')}
              value={campaignSendStatusText(campaign, locale, t)}
            />
          ) : null}
        </section>

        <section className="grid content-start gap-3">
          <h3 className={textStyles.h3}>{t('messagePreview')}</h3>
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
  tooltipLabel,
  value,
}: {
  detail?: ReactNode;
  label: string;
  tooltip?: ReactNode;
  tooltipLabel?: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-1.5">
        <h3 className={textStyles.h3}>{label}</h3>
        {tooltip ? (
          <InfoTooltip label={tooltipLabel ?? ''}>{tooltip}</InfoTooltip>
        ) : null}
      </div>
      <div className={cn('min-w-0', textStyles.p)}>{value}</div>
      {typeof detail === 'string' ? (
        <p className={textStyles.small}>{detail}</p>
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
  t,
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
  t: ReturnType<typeof useTranslations<'Campaigns'>>;
  values: CampaignFormValues;
}) {
  if (campaign && campaign.status !== 'draft') {
    if (frozenRecipientCount === null) {
      return {
        detail: undefined,
        value: isRecipientSummaryLoading
          ? t('loadingSelectedRecipients')
          : t('selectedRecipientsUnavailable'),
      };
    }

    return {
      detail: undefined,
      value: t('selectedWhenPrepared'),
    };
  }

  if (isAudienceLoading) {
    return {
      detail: undefined,
      value: t('checkingEligibleContacts'),
    };
  }

  if (eligibleCount === null) {
    return {
      detail: undefined,
      value: t('eligibleContactsUnavailable'),
    };
  }

  const issueText = audiencePreviewData
    ? (
        <AudienceRuleDetailBadges
          audiencePreviewData={audiencePreviewData}
          t={t}
        />
      )
    : null;

  return {
    detail: issueText,
    value: t('audienceRuleReviewValue', {
      days: values.audienceRule.lapsedDays,
      state: values.audienceRule.includeNoBookingDate
        ? t('included')
        : t('excluded'),
    }),
  };
}

function AudienceRuleDetailBadges({
  audiencePreviewData,
  t,
}: {
  audiencePreviewData: {
    incompleteCount: number;
    missingConsentCount: number;
    recentCampaignExcludedCount: number;
    selectedCampaignsExcludedCount: number;
    suppressedCount: number;
  };
  t: ReturnType<typeof useTranslations<'Campaigns'>>;
}) {
  const badges = [
    {
      count: audiencePreviewData.suppressedCount,
      label: t('suppressedCount', {
        count: audiencePreviewData.suppressedCount,
      }),
    },
    {
      count: audiencePreviewData.incompleteCount,
      label: t('missingPhoneCount', {
        count: audiencePreviewData.incompleteCount,
      }),
    },
    {
      count: audiencePreviewData.missingConsentCount,
      label: t('missingConsentCount', {
        count: audiencePreviewData.missingConsentCount,
      }),
    },
    {
      count: audiencePreviewData.recentCampaignExcludedCount,
      label: t('recentlyContactedCount', {
        count: audiencePreviewData.recentCampaignExcludedCount,
      }),
    },
    {
      count: audiencePreviewData.selectedCampaignsExcludedCount,
      label: t('alreadyReceivedSelectedCampaigns', {
        count: audiencePreviewData.selectedCampaignsExcludedCount,
      }),
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
