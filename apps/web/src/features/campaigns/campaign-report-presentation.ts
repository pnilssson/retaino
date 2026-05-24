import type { CampaignReport } from '@retaino/shared/contracts';
import type {
  SankeyBreakdownLink,
  SankeyBreakdownNode,
  SankeyBreakdownSummaryItem,
} from '@/components/sankey-breakdown';
import {
  formatReportCurrency,
  formatReportNumber,
} from './campaign-report-format';

export type CampaignReportMetric = {
  id:
    | 'bookings'
    | 'clicks'
    | 'credits'
    | 'delivered'
    | 'failed'
    | 'inProgress'
    | 'optOuts'
    | 'recipients'
    | 'replies'
    | 'revenue'
    | 'skipped';
  label: string;
  value: string;
};

export function createCampaignReportFunnel(report: CampaignReport): {
  links: SankeyBreakdownLink[];
  nodes: SankeyBreakdownNode[];
  summary: SankeyBreakdownSummaryItem[];
} {
  return {
    nodes: [
      { color: 'var(--chart-3)', name: 'Selected' },
      { color: 'var(--chart-2)', name: 'Sent' },
      { color: 'var(--muted-foreground)', name: 'Skipped' },
      { color: 'var(--chart-2)', name: 'Delivered' },
      { color: 'var(--destructive)', name: 'Failed' },
      { color: 'var(--chart-4)', name: 'In progress' },
    ],
    links: [
      { source: 0, target: 1, value: report.sentCount },
      { source: 0, target: 2, value: report.skippedCount },
      { source: 1, target: 3, value: report.deliveredCount },
      { source: 1, target: 4, value: report.failedCount },
      { source: 1, target: 5, value: report.queuedCount },
    ],
    summary: [
      {
        detail: 'Recipients selected for this send.',
        label: 'Selected',
        value: report.selectedCount,
      },
      {
        detail: 'Messages sent from Retaino.',
        label: 'Sent',
        value: report.sentCount,
      },
      {
        detail: 'Messages confirmed delivered.',
        label: 'Delivered',
        value: report.deliveredCount,
      },
      {
        detail: 'Messages waiting for status update.',
        label: 'In progress',
        value: report.queuedCount,
      },
      {
        detail: 'Messages that could not be delivered.',
        label: 'Failed',
        value: report.failedCount,
      },
      {
        detail: 'Recipients excluded before send.',
        label: 'Skipped',
        value: report.skippedCount,
      },
    ],
  };
}

export function createCampaignReportMetrics(
  report: CampaignReport,
): CampaignReportMetric[] {
  return [
    {
      id: 'recipients',
      label: 'Recipients',
      value: formatReportNumber(report.selectedCount),
    },
    {
      id: 'delivered',
      label: 'Delivered',
      value: formatReportNumber(report.deliveredCount),
    },
    {
      id: 'inProgress',
      label: 'In progress',
      value: formatReportNumber(report.queuedCount),
    },
    {
      id: 'failed',
      label: 'Failed',
      value: formatReportNumber(report.failedCount),
    },
    {
      id: 'skipped',
      label: 'Skipped',
      value: formatReportNumber(report.skippedCount),
    },
    {
      id: 'clicks',
      label: 'Tracked clicks',
      value: formatReportNumber(report.clickCount),
    },
    {
      id: 'replies',
      label: 'Replies',
      value: formatReportNumber(report.inboundReplyCount),
    },
    {
      id: 'optOuts',
      label: 'Opt-outs',
      value: formatReportNumber(report.optOutCount),
    },
    {
      id: 'credits',
      label: 'Credits used',
      value: formatReportNumber(report.actualSmsSegments),
    },
    {
      id: 'bookings',
      label: 'Reported bookings',
      value: formatReportNumber(report.manualOutcome.bookingCount),
    },
    {
      id: 'revenue',
      label: 'Reported revenue',
      value: reportedRevenueValue(report),
    },
  ];
}

function reportedRevenueValue(report: CampaignReport) {
  if (report.manualOutcome.hasMixedCurrencies) {
    return 'Mixed';
  }

  return formatReportCurrency(
    report.manualOutcome.revenueAmountMinor ?? 0,
    report.manualOutcome.currency,
  );
}
