"use client";

import type { ReactNode } from 'react';
import type { Campaign } from '@retaino/shared/contracts';
import { InfoTooltip } from '@/components/info-tooltip';
import {
  AppPageContent,
  AppPageSection,
} from '@/features/appshell/components/app-page-content';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import {
  campaignSendStatusText,
  campaignToFormValues,
} from '../campaign-form-state';
import { CampaignReportPanel } from './campaign-report-panel';
import { messageEstimateText, MessagePreview } from './message-preview';

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

      <AppPageContent>
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <AppPageSection
            description="Audience, destination, and send details."
            title="Campaign details"
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
                label="Sent"
                value={
                  sendAccepted
                    ? 'Send accepted. Waiting for delivery activity.'
                    : campaignSendStatusText(campaign)
                }
              />
            </dl>
          </AppPageSection>

          <AppPageSection
            description={messageEstimateText(values.smsBody)}
            title="Message preview"
          >
            <MessagePreview showLabel={false} smsBody={values.smsBody} />
          </AppPageSection>
        </div>
      </AppPageContent>
    </div>
  );
}

function OverviewDetail({
  label,
  tooltip,
  value,
}: {
  label: string;
  tooltip?: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <dt className={cn('flex items-center gap-1.5', textStyles.meta)}>
        {label}
        {tooltip ? (
          <InfoTooltip label={`${label} details`}>{tooltip}</InfoTooltip>
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
