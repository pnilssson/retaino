"use client";

import type { Campaign, CampaignReport } from '@retaino/shared/contracts';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  CircleSlash,
  CircleDollarSign,
  MailQuestion,
  MousePointerClick,
  RefreshCw,
  Send,
  ShieldOff,
  Users,
} from 'lucide-react';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import {
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import { cn } from '@/lib/utils';
import {
  formatReportCurrency,
  formatReportNumber,
  formatReportPercent,
} from '../campaign-report-format';
import { useCampaignReport } from '../hooks/use-campaign-report';
import { ReportedBookingsSection } from './campaign-reported-bookings';

export function CampaignReportPanel({
  campaign,
  organizationId,
}: {
  campaign: Campaign;
  organizationId: string | null;
}) {
  const report = useCampaignReport({
    campaignId: campaign.id,
    enabled: Boolean(organizationId),
    organizationId,
  });
  const metrics = report.data ? reportMetrics(report.data.report) : [];

  return (
    <AppPageContent>
      <AppPageItem asChild>
        <section>
          <ItemHeader className="items-start gap-4">
            <ItemContent className="gap-2">
              <ItemTitle>Campaign report</ItemTitle>
              <ItemDescription>
                Delivery, reply, opt-out, and click activity for this send.
              </ItemDescription>
            </ItemContent>
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
          </ItemHeader>

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
            <p className="text-sm leading-6 text-muted-foreground">
              Loading campaign report...
            </p>
          ) : report.data ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => (
                  <ReportMetric key={metric.label} metric={metric} />
                ))}
              </dl>
              <ReportedBookingsSection
                campaign={campaign}
                organizationId={organizationId}
                report={report.data.report}
              />
            </>
          ) : null}
        </section>
      </AppPageItem>
    </AppPageContent>
  );
}

type ReportMetric = {
  detail: string;
  icon: typeof Users;
  label: string;
  tone: 'default' | 'good' | 'warning';
  value: string;
};

function ReportMetric({ metric }: { metric: ReportMetric }) {
  return (
    <div className="grid min-h-24 content-between gap-3 border-l border-border pl-4">
      <dt className="flex items-center gap-2 text-sm font-medium leading-5">
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-md',
            metric.tone === 'good'
              ? 'bg-emerald-50 text-emerald-700'
              : metric.tone === 'warning'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-muted text-muted-foreground',
          )}
        >
          <metric.icon aria-hidden="true" className="size-4" />
        </span>
        {metric.label}
      </dt>
      <dd>
        <div className="text-2xl font-semibold tracking-normal tabular-nums">
          {metric.value}
        </div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">
          {metric.detail}
        </div>
      </dd>
    </div>
  );
}

function reportMetrics(report: CampaignReport): ReportMetric[] {
  return [
    {
      detail: recipientDetail(report),
      icon: Users,
      label: 'Recipients',
      tone: 'default',
      value: formatReportNumber(report.selectedCount),
    },
    {
      detail: `${formatReportPercent(report.deliveredCount, report.sentCount)} delivered`,
      icon: CheckCircle2,
      label: 'Delivered',
      tone: 'good',
      value: formatReportNumber(report.deliveredCount),
    },
    {
      detail: `${formatReportNumber(report.queuedCount)} queued`,
      icon: Send,
      label: 'In progress',
      tone: report.queuedCount > 0 ? 'warning' : 'default',
      value: formatReportNumber(report.queuedCount),
    },
    {
      detail: `${formatReportPercent(report.skippedCount, report.selectedCount)} of selected`,
      icon: CircleSlash,
      label: 'Skipped',
      tone: report.skippedCount > 0 ? 'warning' : 'default',
      value: formatReportNumber(report.skippedCount),
    },
    {
      detail: `${formatReportPercent(report.failedCount, report.sentCount)} of sent`,
      icon: AlertCircle,
      label: 'Failed',
      tone: report.failedCount > 0 ? 'warning' : 'default',
      value: formatReportNumber(report.failedCount),
    },
    {
      detail: `${formatReportNumber(report.uniqueClickerCount)} unique recipients`,
      icon: MousePointerClick,
      label: 'Tracked clicks',
      tone: 'default',
      value: formatReportNumber(report.clickCount),
    },
    {
      detail: `${formatReportPercent(report.inboundReplyCount, report.sentCount)} of sent`,
      icon: MailQuestion,
      label: 'Replies',
      tone: 'default',
      value: formatReportNumber(report.inboundReplyCount),
    },
    {
      detail: `${formatReportPercent(report.optOutCount, report.sentCount)} of sent`,
      icon: ShieldOff,
      label: 'Opt-outs',
      tone: report.optOutCount > 0 ? 'warning' : 'default',
      value: formatReportNumber(report.optOutCount),
    },
    {
      detail: `${formatReportNumber(report.estimatedSmsSegments)} estimated`,
      icon: Send,
      label: 'Credits used',
      tone: 'default',
      value: formatReportNumber(report.actualSmsSegments),
    },
    {
      detail: `${formatReportPercent(
        report.manualOutcome.bookingCount,
        report.deliveredCount,
      )} of delivered`,
      icon: CalendarCheck,
      label: 'Reported bookings',
      tone: report.manualOutcome.bookingCount > 0 ? 'good' : 'default',
      value: formatReportNumber(report.manualOutcome.bookingCount),
    },
    {
      detail: reportedRevenueDetail(report),
      icon: CircleDollarSign,
      label: 'Reported revenue',
      tone:
        (report.manualOutcome.revenueAmountMinor ?? 0) > 0 ? 'good' : 'default',
      value: reportedRevenueValue(report),
    },
  ];
}

function reportedRevenueDetail(report: CampaignReport) {
  if (report.manualOutcome.hasMixedCurrencies) {
    return 'Multiple currencies reported';
  }

  const revenuePerDelivered =
    report.manualOutcome.revenuePerDeliveredRecipientMinor;

  if (revenuePerDelivered && revenuePerDelivered > 0) {
    return `${formatReportCurrency(
      revenuePerDelivered,
      report.manualOutcome.currency,
    )} per delivered`;
  }

  return 'Reported by your team';
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

function recipientDetail(report: CampaignReport) {
  const sent = `${formatReportNumber(report.sentCount)} sent`;

  if (report.skippedCount <= 0) {
    return sent;
  }

  return `${sent}, ${formatReportNumber(report.skippedCount)} skipped`;
}
