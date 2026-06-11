import type { CampaignReport } from '@retaino/shared/contracts';
import type {
  SankeyBreakdownLink,
  SankeyBreakdownNode,
  SankeyBreakdownSummaryItem,
} from '@/components/sankey-breakdown';

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
