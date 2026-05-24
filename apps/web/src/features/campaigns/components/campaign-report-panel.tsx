"use client";

import type { Campaign, CampaignReport } from '@retaino/shared/contracts';
import {
  AlertCircle,
  CheckCircle2,
  CircleSlash,
  RefreshCw,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { InfoTooltip } from '@/components/info-tooltip';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import {
  SankeyBreakdown,
  type SankeyBreakdownSummaryItem,
} from '@/components/sankey-breakdown';
import { Button } from '@/components/ui/button';
import {
  AppPageContent,
  AppPageSection,
} from '@/features/appshell/components/app-page-content';
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
  const updateReport = () => {
    void report.refetch();
  };

  return (
    <AppPageContent>
      <AppPageSection
        actions={
          <ReportUpdateActions
            isFetching={report.isFetching}
            onUpdate={updateReport}
          />
        }
        description="Campaign result, delivery state, and next action."
        framed={false}
        title="At a glance"
      >
        {report.isError ? (
          <ItemNotice
            description={
              report.error instanceof Error
                ? report.error.message
                : 'Try updating the report again.'
            }
            title="Report could not be fetched"
            variant="error"
          />
        ) : report.isLoading ? (
          <LoadingState className="py-6" label="Loading campaign report" />
        ) : reportData ? (
          <CampaignReportSummary
            report={reportData}
          />
        ) : null}
      </AppPageSection>

      {reportData ? <DeliveryHealthSection report={reportData} /> : null}
      {reportData ? <ResponseActivitySection report={reportData} /> : null}

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

function ReportUpdateActions({
  isFetching,
  onUpdate,
}: {
  isFetching: boolean;
  onUpdate: () => void;
}) {
  return (
    <Button
      disabled={isFetching}
      onClick={onUpdate}
      type="button"
      variant="outline"
    >
      <RefreshCw
        aria-hidden="true"
        className={isFetching ? 'animate-spin' : undefined}
        data-icon="inline-start"
      />
      Update report
    </Button>
  );
}

function DeliveryHealthSection({ report }: { report: CampaignReport }) {
  const funnel = createCampaignReportFunnel(report);

  return (
    <AppPageSection
      description="Selected recipients through delivery outcome."
      title={
        <span className="inline-flex items-center gap-1.5">
          Delivery health
          <InfoTooltip label="Delivery status information">
            Delivery can keep updating after send while message statuses come
            in.
          </InfoTooltip>
        </span>
      }
    >
      <SankeyBreakdown
        links={funnel.links}
        nodes={funnel.nodes}
        showHeader={false}
        summary={withFunnelSummaryIcons(funnel.summary)}
        title="Delivery health"
      />
    </AppPageSection>
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
