"use client";

import type { Campaign } from '@retaino/shared/contracts';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  CircleSlash,
  MailQuestion,
  MousePointerClick,
  RefreshCw,
  Send,
  ShieldOff,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ItemNotice } from '@/components/item-notice';
import { MetricSummaryEntry } from '@/components/metric-summary-entry';
import {
  SankeyBreakdown,
  type SankeyBreakdownSummaryItem,
} from '@/components/sankey-breakdown';
import { Button } from '@/components/ui/button';
import {
  AppPageContent,
  AppPageItem,
  AppPageSection,
} from '@/features/appshell/components/app-page-content';
import { textStyles } from '@/lib/text-styles';
import {
  createCampaignReportFunnel,
  createCampaignReportMetrics,
  type CampaignReportMetric,
} from '../campaign-report-presentation';
import { useCampaignReport } from '../hooks/use-campaign-report';
import { ReportedBookingsSection } from './campaign-reported-bookings';

const metricIcons: Record<CampaignReportMetric['id'], LucideIcon> = {
  bookings: CalendarCheck,
  clicks: MousePointerClick,
  credits: Send,
  delivered: CheckCircle2,
  failed: AlertCircle,
  inProgress: Send,
  optOuts: ShieldOff,
  recipients: Users,
  replies: MailQuestion,
  revenue: CircleDollarSign,
  skipped: CircleSlash,
};

const metricIconClasses: Record<CampaignReportMetric['id'], string> = {
  bookings: 'bg-emerald-50 text-emerald-700',
  clicks: 'bg-violet-50 text-violet-700',
  credits: 'bg-sky-50 text-sky-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-rose-50 text-rose-700',
  inProgress: 'bg-amber-50 text-amber-700',
  optOuts: 'bg-rose-50 text-rose-700',
  recipients: 'bg-slate-100 text-slate-700',
  replies: 'bg-blue-50 text-blue-700',
  revenue: 'bg-teal-50 text-teal-700',
  skipped: 'bg-zinc-100 text-zinc-700',
};

const funnelSummaryMeta: Record<
  string,
  { icon: LucideIcon; iconClassName: string }
> = {
  Delivered: {
    icon: CheckCircle2,
    iconClassName: 'bg-emerald-50 text-emerald-700',
  },
  Failed: {
    icon: AlertCircle,
    iconClassName: 'bg-rose-50 text-rose-700',
  },
  'In progress': {
    icon: Send,
    iconClassName: 'bg-amber-50 text-amber-700',
  },
  Selected: {
    icon: Users,
    iconClassName: 'bg-slate-100 text-slate-700',
  },
  Sent: {
    icon: Send,
    iconClassName: 'bg-sky-50 text-sky-700',
  },
  Skipped: {
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
  const report = useCampaignReport({
    campaignId: campaign.id,
    enabled: Boolean(organizationId),
    organizationId,
    refetchInterval:
      sendAccepted || campaign.status === 'sending' ? 5000 : false,
  });
  const reportData = report.data?.report ?? null;
  const funnel = reportData ? createCampaignReportFunnel(reportData) : null;
  const funnelSummary = funnel
    ? withFunnelSummaryIcons(funnel.summary)
    : [];
  const metrics = reportData
    ? createCampaignReportMetrics(reportData)
    : [];

  return (
    <AppPageContent>
      <AppPageSection
        actions={
            <Button
              disabled={report.isFetching}
              onClick={() => {
                void report.refetch();
              }}
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" data-icon="inline-start" />
              Refresh
            </Button>
        }
        description="See how selected recipients moved through delivery statuses."
        title="Delivery funnel"
      >
        {report.isError ? (
          <ItemNotice
            description={
              report.error instanceof Error
                ? report.error.message
                : 'Try refreshing the report.'
            }
            title="Report could not be fetched"
            variant="error"
          />
        ) : report.isLoading ? (
          <p className={textStyles.mutedBody}>Loading campaign report...</p>
        ) : reportData && funnel ? (
          <SankeyBreakdown
            links={funnel.links}
            nodes={funnel.nodes}
            showHeader={false}
            summary={funnelSummary}
            title="Delivery funnel"
          />
        ) : null}
      </AppPageSection>

      {reportData && metrics.length > 0 ? (
        <div className="hidden min-w-0 gap-5 sm:grid sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <ReportMetricItem key={metric.id} metric={metric} />
          ))}
        </div>
      ) : null}

      {reportData ? (
        <ReportedBookingsSection
          campaign={campaign}
          organizationId={organizationId}
          report={reportData}
        />
      ) : null}
    </AppPageContent>
  );
}

function ReportMetricItem({ metric }: { metric: CampaignReportMetric }) {
  return (
    <AppPageItem asChild>
      <dl>
        <ReportMetric metric={metric} />
      </dl>
    </AppPageItem>
  );
}

function ReportMetric({ metric }: { metric: CampaignReportMetric }) {
  const Icon = metricIcons[metric.id];

  return (
    <MetricSummaryEntry
      className="min-h-0 border-t-0 p-0"
      icon={Icon}
      iconClassName={metricIconClasses[metric.id]}
      label={metric.label}
      value={metric.value}
    />
  );
}

function withFunnelSummaryIcons(
  summary: SankeyBreakdownSummaryItem[],
): SankeyBreakdownSummaryItem[] {
  return summary.map((item) => ({
    ...item,
    ...funnelSummaryMeta[item.label],
  }));
}
