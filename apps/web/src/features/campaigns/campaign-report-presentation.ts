import type { CampaignReport } from '@retaino/shared/contracts';
import type {
  SankeyBreakdownLink,
  SankeyBreakdownNode,
  SankeyBreakdownSummaryItem,
} from '@/components/sankey-breakdown';
import type { CampaignText } from './campaign-form-state';

export function createCampaignReportFunnel(
  report: CampaignReport,
  t: CampaignText,
): {
  links: SankeyBreakdownLink[];
  nodes: SankeyBreakdownNode[];
  summary: SankeyBreakdownSummaryItem[];
} {
  return {
    nodes: [
      { color: 'var(--chart-3)', name: t('funnelSelected') },
      { color: 'var(--chart-2)', name: t('funnelSent') },
      { color: 'var(--muted-foreground)', name: t('funnelSkipped') },
      { color: 'var(--chart-2)', name: t('funnelDelivered') },
      { color: 'var(--destructive)', name: t('funnelFailed') },
      { color: 'var(--chart-4)', name: t('funnelInProgress') },
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
        detail: t('funnelSelectedDetail'),
        label: t('funnelSelected'),
        value: report.selectedCount,
      },
      {
        detail: t('funnelSentDetail'),
        label: t('funnelSent'),
        value: report.sentCount,
      },
      {
        detail: t('funnelDeliveredDetail'),
        label: t('funnelDelivered'),
        value: report.deliveredCount,
      },
      {
        detail: t('funnelInProgressDetail'),
        label: t('funnelInProgress'),
        value: report.queuedCount,
      },
      {
        detail: t('funnelFailedDetail'),
        label: t('funnelFailed'),
        value: report.failedCount,
      },
      {
        detail: t('funnelSkippedDetail'),
        label: t('funnelSkipped'),
        value: report.skippedCount,
      },
    ],
  };
}
