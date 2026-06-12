"use client";

import type { ReactNode } from 'react';
import type { Campaign } from '@retaino/shared/contracts';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
import { InfoTooltip } from '@/components/info-tooltip';
import { StatusBadge } from '@/components/status-badge';
import { ContentSection } from '@/features/appshell/components/content-section';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import {
  campaignSendStatusText,
  campaignToFormValues,
} from '../campaign-form-state';
import { CampaignReportPanel } from './campaign-report-panel';
import { CampaignStatusBadge } from './campaign-status-badge';
import {
  MessageEstimate,
  MessagePreview,
} from './message-preview';

export function CampaignOverview({
  campaign,
  organizationId,
  sendAccepted = false,
}: {
  campaign: Campaign;
  organizationId: string | null;
  sendAccepted?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('Campaigns');
  const values = campaignToFormValues(campaign);

  return (
    <div className="grid gap-5">
      <CampaignReportPanel
        campaign={campaign}
        organizationId={organizationId}
        sendAccepted={sendAccepted}
      />

      <div className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <ContentSection
            title={
              <span className="flex flex-wrap items-center gap-2">
                {t('campaignDetails')}
                {sendAccepted ? (
                  <StatusBadge label={t('sendQueued')} tone="amber" />
                ) : (
                  <CampaignStatusBadge status={campaign.status} />
                )}
              </span>
            }
          >
            <dl className="grid content-start gap-4">
              <OverviewDetail
                label={t('audienceRule')}
                tooltipLabel={t('audienceRuleDetails')}
                tooltip={audienceRuleDetail(campaign, t)}
                value={audienceRuleValue(campaign, t)}
              />

              <OverviewDetail
                label={t('bookingLink')}
                tooltipLabel={t('bookingLinkDetails')}
                tooltip={t('trackedDestinationTooltip')}
                value={
                  campaign.bookingUrl ? (
                    <a
                      className="break-words underline underline-offset-4"
                      href={campaign.bookingUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {campaign.bookingUrl}
                    </a>
                  ) : (
                    t('notAdded')
                  )
                }
              />

              <OverviewDetail
                label={t('campaignStatus')}
                value={
                  sendAccepted
                    ? t('sendAcceptedWaiting')
                    : campaignSendStatusText(campaign, locale, t)
                }
              />
            </dl>
          </ContentSection>

          <ContentSection title={t('messagePreview')}>
            <MessagePreview showLabel={false} smsBody={values.smsBody} />
            <MessageEstimate smsBody={values.smsBody} />
          </ContentSection>
        </div>
      </div>
    </div>
  );
}

function OverviewDetail({
  label,
  tooltip,
  tooltipLabel,
  value,
}: {
  label: ReactNode;
  tooltip?: string;
  tooltipLabel?: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <dt className={cn('flex items-center gap-1.5', textStyles.meta)}>
        {label}
        {tooltip ? (
          <InfoTooltip label={tooltipLabel ?? ''}>
            {tooltip}
          </InfoTooltip>
        ) : null}
      </dt>
      <dd className={cn('min-w-0', textStyles.itemTitle)}>{value}</dd>
    </div>
  );
}

function audienceRuleValue(
  campaign: Campaign,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
) {
  return t('lastBookingAtLeastDaysAgo', {
    days: campaign.audienceRule.lapsedDays,
  });
}

function audienceRuleDetail(
  campaign: Campaign,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
) {
  return campaign.audienceRule.includeNoBookingDate
    ? t('contactsWithoutBookingIncluded')
    : t('contactsWithoutBookingExcluded');
}
