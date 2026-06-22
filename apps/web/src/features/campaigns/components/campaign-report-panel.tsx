"use client";

import type {
  Campaign,
  CampaignReport,
} from '@retaino/shared/contracts';
import {
  AlertCircle,
  CircleSlash,
  RefreshCw,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  FunnelBreakdown,
  type FunnelBreakdownMetric,
} from '@/components/funnel-breakdown';
import { InfoTooltip } from '@/components/info-tooltip';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { ContentSection } from '@/features/appshell/components/content-section';
import { createCampaignReportFunnel } from '../campaign-report-presentation';
import { useCampaignReport } from '../hooks/use-campaign-report';
import { ReportedBookingsSection } from './campaign-reported-bookings';
import {
  CampaignReportSummary,
  ResponseActivitySection,
} from './campaign-report-summary';

const funnelSummaryMeta: Record<
  string,
  { icon: LucideIcon; iconClassName: string }
> = {
  funnelFailed: {
    icon: AlertCircle,
    iconClassName: 'bg-rose-50 text-rose-700',
  },
  funnelInProgress: {
    icon: Send,
    iconClassName: 'bg-amber-50 text-amber-700',
  },
  funnelSkipped: {
    icon: CircleSlash,
    iconClassName: 'bg-zinc-100 text-zinc-700',
  },
};

export function CampaignReportPanel({
  campaign,
  organizationId,
  sendAccepted = false,
}: {
  campaign: Campaign;
  organizationId: string | null;
  sendAccepted?: boolean;
}) {
  const t = useTranslations('Campaigns');
  const report = useCampaignReport({
    campaignId: campaign.id,
    enabled: Boolean(organizationId),
    organizationId,
    refetchInterval:
      sendAccepted || campaign.status === 'sending' ? 5000 : false,
  });
  const reportData = report.data?.report ?? null;
  const updateReport = () => {
    void report.refetch();
  };

  return (
    <div className="grid gap-5">
      <ContentSection
        actions={
          <ReportUpdateActions
            isFetching={report.isFetching}
            onUpdate={updateReport}
          />
        }
        framed={false}
        title={t('outcome')}
      >
        {report.isError ? (
          <ItemNotice
            description={
              report.error instanceof Error
                ? report.error.message
                : t('reportFetchErrorDescription')
            }
            title={t('reportFetchErrorTitle')}
            variant="error"
          />
        ) : report.isLoading ? (
          <LoadingState className="py-6" label={t('loadingCampaignReport')} />
        ) : reportData ? (
          <CampaignReportSummary
            report={reportData}
          />
        ) : null}
      </ContentSection>

      {reportData ? <DeliveryHealthSection report={reportData} /> : null}
      {reportData ? <ResponseActivitySection report={reportData} /> : null}

      {reportData ? (
        <ReportedBookingsSection
          campaign={campaign}
          organizationId={organizationId}
          report={reportData}
        />
      ) : null}
    </div>
  );
}

function ReportUpdateActions({
  isFetching,
  onUpdate,
}: {
  isFetching: boolean;
  onUpdate: () => void;
}) {
  const t = useTranslations('Campaigns');

  return (
    <Button
      disabled={isFetching}
      onClick={onUpdate}
      type="button"
    >
      <RefreshCw
        aria-hidden="true"
        className={isFetching ? 'animate-spin' : undefined}
        data-icon="inline-start"
      />
      {t('updateReport')}
    </Button>
  );
}

function DeliveryHealthSection({ report }: { report: CampaignReport }) {
  const t = useTranslations('Campaigns');
  const funnel = createCampaignReportFunnel(report, t);
  const hasDeliveryHealthValues = [...funnel.stages, ...funnel.metrics].some(
    (item) => item.value > 0,
  );

  if (!hasDeliveryHealthValues) {
    return null;
  }

  return (
    <ContentSection
      title={
        <span className="inline-flex items-center gap-1.5">
          {t('deliveryHealth')}
          <InfoTooltip label={t('deliveryStatusInformation')}>
            {t('deliveryHealthDescription')}
          </InfoTooltip>
        </span>
      }
    >
      <FunnelBreakdown
        metrics={withFunnelSummaryIcons(funnel.metrics, t)}
        stages={funnel.stages}
        title={t('deliveryHealth')}
      />
    </ContentSection>
  );
}

function withFunnelSummaryIcons(
  summary: FunnelBreakdownMetric[],
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
): FunnelBreakdownMetric[] {
  return summary.map((item) => ({
    ...item,
    ...funnelSummaryMeta[funnelSummaryKey(item.label, t)],
  }));
}

function funnelSummaryKey(
  label: string,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
): keyof typeof funnelSummaryMeta {
  const entries = [
    ['funnelFailed', t('funnelFailed')],
    ['funnelInProgress', t('funnelInProgress')],
    ['funnelSkipped', t('funnelSkipped')],
  ] as const;

  return entries.find((entry) => entry[1] === label)?.[0] ?? 'funnelSkipped';
}
