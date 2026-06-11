import type { CampaignReport } from '@retaino/shared/contracts';
import {
  formatReportCurrency,
  formatReportNumber,
  formatReportPercent,
} from './campaign-report-format';

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
): ReportSummaryMetric {
  const revenueAmount = report.reportedOutcome.revenueAmountMinor ?? 0;

  return {
    detail: averageBookingRevenueDetail(report, locale),
    icon: 'money',
    iconClassName:
      revenueAmount > 0 || report.reportedOutcome.hasMixedCurrencies
        ? 'bg-teal-50 text-teal-700'
        : 'bg-muted text-muted-foreground',
    label: 'Reported revenue',
    value: report.reportedOutcome.hasMixedCurrencies
      ? 'Mixed revenue'
      : formatReportCurrency(
          revenueAmount,
          report.reportedOutcome.currency,
          locale,
        ),
  };
}

function averageBookingRevenueDetail(report: CampaignReport, locale: string) {
  const bookingCount = report.reportedOutcome.bookingCount;

  if (bookingCount === 0) {
    return 'No average booking revenue yet.';
  }

  if (report.reportedOutcome.hasMixedCurrencies) {
    return 'Average booking revenue unavailable.';
  }

  const revenueAmount = report.reportedOutcome.revenueAmountMinor ?? 0;
  const averageRevenue = Math.round(revenueAmount / bookingCount);

  return `${formatReportCurrency(
    averageRevenue,
    report.reportedOutcome.currency,
    locale,
  )} average booking revenue.`;
}

export function createAtAGlanceMetrics(
  report: CampaignReport,
  locale: string,
): ReportSummaryMetric[] {
  return [
    {
      detail: `${formatReportNumber(
        report.reportedOutcome.bookingCount,
        locale,
      )} reported bookings.`,
      icon: 'calendar',
      iconClassName: 'bg-emerald-50 text-emerald-700',
      label: 'Booking rate',
      value: formatReportPercent(
        report.reportedOutcome.bookingCount,
        report.deliveredCount,
        locale,
      ),
    },
    {
      detail: `${formatReportNumber(
        report.actualSmsSegments,
        locale,
      )} total SMS credits.`,
      icon: 'send',
      iconClassName: 'bg-sky-50 text-sky-700',
      label: 'Credits used',
      value: formatReportNumber(report.actualSmsSegments, locale),
    },
  ];
}

export function createResponseMetrics(
  report: CampaignReport,
  locale: string,
): ReportSummaryMetric[] {
  return [
    {
      detail: `${formatReportPercent(
        report.uniqueClickerCount,
        report.deliveredCount,
        locale,
      )} of delivered.`,
      icon: 'pointer',
      iconClassName: 'bg-violet-50 text-violet-700',
      label: 'Unique clickers',
      value: formatReportNumber(report.uniqueClickerCount, locale),
    },
    {
      detail: 'Total tracked clicks.',
      icon: 'pointer',
      iconClassName: 'bg-violet-50 text-violet-700',
      label: 'Tracked clicks',
      value: formatReportNumber(report.clickCount, locale),
    },
    {
      detail: `${formatReportPercent(
        report.inboundReplyCount,
        report.sentCount,
        locale,
      )} of sent.`,
      icon: 'message',
      iconClassName: 'bg-blue-50 text-blue-700',
      label: 'Unique replies',
      value: formatReportNumber(report.inboundReplyCount, locale),
    },
    {
      detail: `${formatReportPercent(
        report.optOutCount,
        report.sentCount,
        locale,
      )} of sent.`,
      icon: 'shield',
      iconClassName: 'bg-rose-50 text-rose-700',
      label: 'Opt-outs',
      value: formatReportNumber(report.optOutCount, locale),
    },
  ];
}
