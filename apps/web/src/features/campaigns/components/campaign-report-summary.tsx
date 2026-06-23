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
import {
  useLocale,
  useTranslations,
} from 'next-intl';
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
  const locale = useLocale();
  const t = useTranslations('Campaigns');
  const outcome = createOutcomeSummary(report, locale, t);
  const supportMetrics = createAtAGlanceMetrics(report, locale, t);

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
  const locale = useLocale();
  const t = useTranslations('Campaigns');
  const metrics = createResponseMetrics(report, locale, t);

  return (
    <ContentSection
      framed={false}
      title={t('responseActivity')}
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
          detailIcon={metric.icon === 'money' && metric.detail ? <AverageIcon /> : undefined}
          icon={Icon}
          iconClassName={metric.iconClassName}
          label={metric.label}
          value={metric.value}
        />
      </dl>
    </ContentSection>
  );
}

function AverageIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3"
      fill="none"
      viewBox="0 0 12 12"
    >
      <path
        d="M2.25 8.75 4.5 6.5l1.75 1.75 3.5-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
      <path
        d="M8.25 4.25h1.5v1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
    </svg>
  );
}
