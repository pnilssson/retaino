import type { CampaignReport } from '@retaino/shared/contracts';
import type {
  FunnelBreakdownMetric,
  FunnelBreakdownStage,
} from '@/components/funnel-breakdown';
import type { CampaignText } from './campaign-form-state';

export function createCampaignReportFunnel(
  report: CampaignReport,
  t: CampaignText,
): {
  metrics: FunnelBreakdownMetric[];
  stages: FunnelBreakdownStage[];
} {
  return {
    stages: [
      {
        label: t('funnelSelected'),
        value: report.selectedCount,
      },
      {
        label: t('funnelSent'),
        value: report.sentCount,
      },
      {
        label: t('funnelDelivered'),
        value: report.deliveredCount,
      },
    ],
    metrics: [
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
