"use client";

import type { ReactNode } from 'react';
import type { Campaign } from '@retaino/shared/contracts';
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
  messageEstimateText,
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
            description="Audience, destination, and send details."
            title={
              <span className="flex flex-wrap items-center gap-2">
                Campaign details
                {sendAccepted ? (
                  <StatusBadge label="Send queued" tone="amber" />
                ) : (
                  <CampaignStatusBadge status={campaign.status} />
                )}
              </span>
            }
          >
            <dl className="grid content-start gap-4">
              <OverviewDetail
                label="Audience rule"
                tooltip={audienceRuleDetail(campaign)}
                value={audienceRuleValue(campaign)}
              />

              <OverviewDetail
                label="Booking link"
                tooltip="Tracked destination in each SMS."
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
                    'Not added'
                  )
                }
              />

              <OverviewDetail
                label="Campaign status"
                value={
                  sendAccepted
                    ? 'Send accepted. Waiting for delivery activity.'
                    : campaignSendStatusText(campaign)
                }
              />
            </dl>
          </ContentSection>

          <ContentSection
            description={messageEstimateText(values.smsBody)}
            title="Message preview"
          >
            <MessagePreview showLabel={false} smsBody={values.smsBody} />
          </ContentSection>
        </div>
      </div>
    </div>
  );
}

function OverviewDetail({
  label,
  tooltip,
  value,
}: {
  label: ReactNode;
  tooltip?: string;
  value: ReactNode;
}) {
  const tooltipLabel =
    typeof label === 'string' ? `${label} details` : 'Campaign detail information';

  return (
    <div className="grid gap-1">
      <dt className={cn('flex items-center gap-1.5', textStyles.meta)}>
        {label}
        {tooltip ? (
          <InfoTooltip label={tooltipLabel}>{tooltip}</InfoTooltip>
        ) : null}
      </dt>
      <dd className={cn('min-w-0', textStyles.itemTitle)}>{value}</dd>
    </div>
  );
}

function audienceRuleValue(campaign: Campaign) {
  return `Last booking at least ${campaign.audienceRule.lapsedDays} days ago`;
}

function audienceRuleDetail(campaign: Campaign) {
  return campaign.audienceRule.includeNoBookingDate
    ? 'Contacts without a booking date were included.'
    : 'Contacts without a booking date were excluded.';
}
