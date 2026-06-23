import type { CampaignReport } from '@retaino/shared/contracts';
import {
  formatReportCurrency,
  formatReportNumber,
  formatReportPercent,
} from './campaign-report-format';
import type { CampaignText } from './campaign-form-state';

export type ReportSummaryIcon =
  | 'alert'
  | 'calendar'
  | 'check'
  | 'money'
  | 'message'
  | 'pointer'
  | 'send'
  | 'shield';

export type ReportSummaryMetric = {
  detail?: string;
  icon: ReportSummaryIcon;
  iconClassName: string;
  label: string;
  value: string;
};

export function createOutcomeSummary(
  report: CampaignReport,
  locale: string,
  t: CampaignText,
): ReportSummaryMetric {
  const revenueAmount = report.reportedOutcome.revenueAmountMinor ?? 0;

  return {
    detail: undefined,
    icon: 'money',
    iconClassName:
      revenueAmount > 0 || report.reportedOutcome.hasMixedCurrencies
        ? 'bg-teal-50 text-teal-700'
        : 'bg-muted text-muted-foreground',
    label: t('reportedRevenue'),
    value: report.reportedOutcome.hasMixedCurrencies
      ? t('mixedRevenue')
      : formatReportCurrency(
          revenueAmount,
          report.reportedOutcome.currency,
          locale,
        ),
  };
}

export function createAtAGlanceMetrics(
  report: CampaignReport,
  locale: string,
  t: CampaignText,
): ReportSummaryMetric[] {
  return [
    {
      detail: distinctDetailValue(
        formatReportNumber(report.reportedOutcome.bookingCount, locale),
        formatReportPercent(
          report.reportedOutcome.bookingCount,
          report.deliveredCount,
          locale,
        ),
      ),
      icon: 'calendar',
      iconClassName: 'bg-emerald-50 text-emerald-700',
      label: t('bookingRate'),
      value: formatReportPercent(
        report.reportedOutcome.bookingCount,
        report.deliveredCount,
        locale,
      ),
    },
    {
      detail: undefined,
      icon: 'send',
      iconClassName: 'bg-sky-50 text-sky-700',
      label: t('creditsUsed'),
      value: formatReportNumber(report.actualSmsSegments, locale),
    },
  ];
}

export function createResponseMetrics(
  report: CampaignReport,
  locale: string,
  t: CampaignText,
): ReportSummaryMetric[] {
  return [
    {
      detail: distinctDetailValue(
        formatReportPercent(
          report.uniqueClickerCount,
          report.deliveredCount,
          locale,
        ),
        formatReportNumber(report.uniqueClickerCount, locale),
      ),
      icon: 'pointer',
      iconClassName: 'bg-violet-50 text-violet-700',
      label: t('uniqueClickers'),
      value: formatReportNumber(report.uniqueClickerCount, locale),
    },
    {
      detail: undefined,
      icon: 'pointer',
      iconClassName: 'bg-violet-50 text-violet-700',
      label: t('trackedClicks'),
      value: formatReportNumber(report.clickCount, locale),
    },
    {
      detail: distinctDetailValue(
        formatReportPercent(
          report.inboundReplyCount,
          report.sentCount,
          locale,
        ),
        formatReportNumber(report.inboundReplyCount, locale),
      ),
      icon: 'message',
      iconClassName: 'bg-blue-50 text-blue-700',
      label: t('uniqueReplies'),
      value: formatReportNumber(report.inboundReplyCount, locale),
    },
    {
      detail: distinctDetailValue(
        formatReportPercent(report.optOutCount, report.sentCount, locale),
        formatReportNumber(report.optOutCount, locale),
      ),
      icon: 'shield',
      iconClassName: 'bg-rose-50 text-rose-700',
      label: t('optOuts'),
      value: formatReportNumber(report.optOutCount, locale),
    },
  ];
}

function distinctDetailValue(detail: string, value: string) {
  return normalizeMetricValue(detail) === normalizeMetricValue(value) ? undefined : detail;
}

function normalizeMetricValue(value: string) {
  return value.replace(/\s/g, '').toLocaleLowerCase();
}
