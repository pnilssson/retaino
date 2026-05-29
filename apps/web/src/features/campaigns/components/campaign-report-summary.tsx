"use client";

import type { CampaignReport } from '@retaino/shared/contracts';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  MailQuestion,
  MousePointerClick,
  Send,
  ShieldOff,
  type LucideIcon,
} from 'lucide-react';
import { MetricSummaryEntry } from '@/components/metric-summary-entry';
import { ContentSection } from '@/features/appshell/components/content-section';
import {
  createAtAGlanceMetrics,
  createOutcomeSummary,
  createResponseMetrics,
  type ReportSummaryIcon,
  type ReportSummaryMetric,
} from '../campaign-report-summary-model';

const summaryIcons: Record<ReportSummaryIcon, LucideIcon> = {
  alert: AlertCircle,
  calendar: CalendarCheck,
  check: CheckCircle2,
  message: MailQuestion,
  money: CircleDollarSign,
  pointer: MousePointerClick,
  send: Send,
  shield: ShieldOff,
};

export function CampaignReportSummary({
  report,
}: {
  report: CampaignReport;
}) {
  const outcome = createOutcomeSummary(report);
  const supportMetrics = createAtAGlanceMetrics(report);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryMetricItem metric={outcome} />
      {supportMetrics.map((metric) => (
        <SummaryMetricItem key={metric.label} metric={metric} />
      ))}
    </div>
  );
}

export function ResponseActivitySection({ report }: { report: CampaignReport }) {
  const metrics = createResponseMetrics(report);

  return (
    <ContentSection
      framed={false}
      title="Response activity"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <SummaryMetricItem key={metric.label} metric={metric} />
        ))}
      </div>
    </ContentSection>
  );
}

function SummaryMetricItem({ metric }: { metric: ReportSummaryMetric }) {
  const Icon = summaryIcons[metric.icon];

  return (
    <ContentSection asChild>
      <dl>
        <MetricSummaryEntry
          className="min-h-0 border-t-0 p-0"
          detail={metric.detail}
          icon={Icon}
          iconClassName={metric.iconClassName}
          label={metric.label}
          value={metric.value}
        />
      </dl>
    </ContentSection>
  );
}
