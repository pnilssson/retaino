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
): ReportSummaryMetric {
  const revenueAmount = report.reportedOutcome.revenueAmountMinor ?? 0;

  return {
    detail: averageBookingRevenueDetail(report),
    icon: 'money',
    iconClassName:
      revenueAmount > 0 || report.reportedOutcome.hasMixedCurrencies
        ? 'bg-teal-50 text-teal-700'
        : 'bg-muted text-muted-foreground',
    label: 'Reported revenue',
    value: report.reportedOutcome.hasMixedCurrencies
      ? 'Mixed revenue'
      : formatReportCurrency(revenueAmount, report.reportedOutcome.currency),
  };
}

function averageBookingRevenueDetail(report: CampaignReport) {
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
  )} average booking revenue.`;
}

export function createAtAGlanceMetrics(
  report: CampaignReport,
): ReportSummaryMetric[] {
  return [
    {
      detail: `${formatReportNumber(report.reportedOutcome.bookingCount)} reported bookings.`,
      icon: 'calendar',
      iconClassName: 'bg-emerald-50 text-emerald-700',
      label: 'Booking rate',
      value: formatReportPercent(
        report.reportedOutcome.bookingCount,
        report.deliveredCount,
      ),
    },
    {
      detail: `${formatReportNumber(report.actualSmsSegments)} total SMS credits.`,
      icon: 'send',
      iconClassName: 'bg-sky-50 text-sky-700',
      label: 'Credits used',
      value: formatReportNumber(report.actualSmsSegments),
    },
  ];
}

export function createResponseMetrics(
  report: CampaignReport,
): ReportSummaryMetric[] {
  return [
    {
      detail: `${formatReportPercent(report.uniqueClickerCount, report.deliveredCount)} of delivered.`,
      icon: 'pointer',
      iconClassName: 'bg-violet-50 text-violet-700',
      label: 'Unique clickers',
      value: formatReportNumber(report.uniqueClickerCount),
    },
    {
      detail: 'Total tracked clicks.',
      icon: 'pointer',
      iconClassName: 'bg-violet-50 text-violet-700',
      label: 'Tracked clicks',
      value: formatReportNumber(report.clickCount),
    },
    {
      detail: `${formatReportPercent(
        report.inboundReplyCount,
        report.sentCount,
      )} of sent.`,
      icon: 'message',
      iconClassName: 'bg-blue-50 text-blue-700',
      label: 'Unique replies',
      value: formatReportNumber(report.inboundReplyCount),
    },
    {
      detail: `${formatReportPercent(report.optOutCount, report.sentCount)} of sent.`,
      icon: 'shield',
      iconClassName: 'bg-rose-50 text-rose-700',
      label: 'Opt-outs',
      value: formatReportNumber(report.optOutCount),
    },
  ];
}
