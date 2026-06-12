"use client";

import type {
  Campaign,
  CampaignReport,
} from '@retaino/shared/contracts';
import {
  AlertCircle,
  CheckCircle2,
  CircleSlash,
  RefreshCw,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { InfoTooltip } from '@/components/info-tooltip';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import {
  SankeyBreakdown,
  type SankeyBreakdownSummaryItem,
} from '@/components/sankey-breakdown';
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
  funnelDelivered: {
    icon: CheckCircle2,
    iconClassName: 'bg-emerald-50 text-emerald-700',
  },
  funnelFailed: {
    icon: AlertCircle,
    iconClassName: 'bg-rose-50 text-rose-700',
  },
  funnelInProgress: {
    icon: Send,
    iconClassName: 'bg-amber-50 text-amber-700',
  },
  funnelSelected: {
    icon: Users,
    iconClassName: 'bg-slate-100 text-slate-700',
  },
  funnelSent: {
    icon: Send,
    iconClassName: 'bg-sky-50 text-sky-700',
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
  const hasDeliveryHealthValues = funnel.summary.some(
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
      <SankeyBreakdown
        links={funnel.links}
        nodes={funnel.nodes}
        showHeader={false}
        summary={withFunnelSummaryIcons(funnel.summary, t)}
        title={t('deliveryHealth')}
      />
    </ContentSection>
  );
}

function withFunnelSummaryIcons(
  summary: SankeyBreakdownSummaryItem[],
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
): SankeyBreakdownSummaryItem[] {
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
    ['funnelDelivered', t('funnelDelivered')],
    ['funnelFailed', t('funnelFailed')],
    ['funnelInProgress', t('funnelInProgress')],
    ['funnelSelected', t('funnelSelected')],
    ['funnelSent', t('funnelSent')],
    ['funnelSkipped', t('funnelSkipped')],
  ] as const;

  return entries.find((entry) => entry[1] === label)?.[0] ?? 'funnelSelected';
}
