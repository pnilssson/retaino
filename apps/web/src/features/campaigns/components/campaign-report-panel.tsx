"use client";

import type { Campaign, CampaignReport } from '@retaino/shared/contracts';
import {
  AlertCircle,
  CheckCircle2,
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
import { useCampaignReport } from '../hooks/use-campaign-report';

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
              tone="destructive"
            />
          ) : report.isLoading ? (
            <p className="text-sm leading-6 text-muted-foreground">
              Loading campaign report…
            </p>
          ) : report.data ? (
            <>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => (
                  <ReportMetric key={metric.label} metric={metric} />
                ))}
              </dl>
              <p className="text-xs leading-5 text-muted-foreground">
                Clicks show tracked link activity. Bookings and revenue are
                reported separately when attribution is available.
              </p>
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
      detail: `${formatNumber(report.sentCount)} sent`,
      icon: Users,
      label: 'Recipients',
      tone: 'default',
      value: formatNumber(report.selectedCount),
    },
    {
      detail: `${formatPercent(report.deliveredCount, report.sentCount)} delivered`,
      icon: CheckCircle2,
      label: 'Delivered',
      tone: 'good',
      value: formatNumber(report.deliveredCount),
    },
    {
      detail: `${formatNumber(report.queuedCount)} queued`,
      icon: Send,
      label: 'In progress',
      tone: report.failedCount > 0 ? 'warning' : 'default',
      value: formatNumber(report.queuedCount),
    },
    {
      detail: `${formatPercent(report.failedCount, report.sentCount)} of sent`,
      icon: AlertCircle,
      label: 'Failed',
      tone: report.failedCount > 0 ? 'warning' : 'default',
      value: formatNumber(report.failedCount),
    },
    {
      detail: `${formatNumber(report.uniqueClickerCount)} unique recipients`,
      icon: MousePointerClick,
      label: 'Tracked clicks',
      tone: 'default',
      value: formatNumber(report.clickCount),
    },
    {
      detail: `${formatPercent(report.inboundReplyCount, report.sentCount)} of sent`,
      icon: MailQuestion,
      label: 'Replies',
      tone: 'default',
      value: formatNumber(report.inboundReplyCount),
    },
    {
      detail: `${formatPercent(report.optOutCount, report.sentCount)} of sent`,
      icon: ShieldOff,
      label: 'Opt-outs',
      tone: report.optOutCount > 0 ? 'warning' : 'default',
      value: formatNumber(report.optOutCount),
    },
    {
      detail: `${formatNumber(report.estimatedSmsSegments)} estimated`,
      icon: AlertCircle,
      label: 'Actual segments',
      tone: 'default',
      value: formatNumber(report.actualSmsSegments),
    },
    {
      detail:
        report.estimatedCostMinor === null
          ? 'Estimate pending'
          : `${formatCurrency(report.estimatedCostMinor, report.currency)} estimated`,
      icon: Send,
      label: 'Cost',
      tone: 'default',
      value:
        report.actualCostMinor === null
          ? 'Pending'
          : formatCurrency(report.actualCostMinor, report.currency),
    },
  ];
}

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined).format(value);
}

function formatPercent(value: number, total: number) {
  if (total <= 0) {
    return '0%';
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(value / total);
}

function formatCurrency(valueMinor: number, currency: string | null) {
  const currencyCode = currency ?? 'SEK';

  return new Intl.NumberFormat(undefined, {
    currency: currencyCode,
    style: 'currency',
  }).format(valueMinor / 100);
}
