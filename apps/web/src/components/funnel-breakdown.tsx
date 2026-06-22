"use client";

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from 'next-intl';
import {
  FunnelChart,
  type FunnelStage,
} from '@/components/charts/funnel-chart';
import { funnelStageGradient } from '@/components/charts/funnel-palette';
import { MetricSummaryEntry } from '@/components/metric-summary-entry';
import { useMediaQuery } from '@/hooks/use-media-query';
import { getIntlLocale } from '@/lib/locale-format';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export type FunnelBreakdownStage = {
  label: string;
  value: number;
};

export type FunnelBreakdownMetric = {
  detail?: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  label: string;
  value: number;
};

export function FunnelBreakdown({
  className,
  hideZeroMetrics = true,
  metrics = [],
  stages,
  title,
}: {
  className?: string;
  hideZeroMetrics?: boolean;
  metrics?: FunnelBreakdownMetric[];
  stages: FunnelBreakdownStage[];
  title: string;
}) {
  const locale = useLocale();
  const intlLocale = getIntlLocale(locale);
  const isDesktop = useMediaQuery('(min-width: 640px)');
  const formatValue = (value: number) =>
    new Intl.NumberFormat(intlLocale).format(value);
  const hasStageValue = stages.some((stage) => stage.value > 0);
  const chartStages = hasStageValue
    ? stages.map(
        (stage, index): FunnelStage => ({
          gradient: funnelStageGradient(index, stages.length),
          displayValue: formatValue(stage.value),
          label: stage.label,
          value: stage.value,
        }),
      )
    : [];
  const visibleMetrics = hideZeroMetrics
    ? metrics.filter((metric) => metric.value > 0)
    : metrics;
  const chartEdgeClassName =
    visibleMetrics.length > 0 ? '-mx-5 -mt-5 sm:mt-0' : '-m-5 sm:-mx-5 sm:my-0';

  if (chartStages.length === 0 && visibleMetrics.length === 0) {
    return null;
  }

  return (
    <div className={cn('grid gap-4', className)}>
      <div className="sr-only">
        <p>{title}</p>
        <dl>
          {stages.map((stage) => (
            <div key={stage.label}>
              <dt>{stage.label}</dt>
              <dd>{formatValue(stage.value)}</dd>
            </div>
          ))}
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{formatValue(metric.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {chartStages.length > 0 ? (
        <FunnelChart
          className={cn(
            'w-[calc(100%+2.5rem)] [&_span]:max-w-full [&_span]:text-center sm:[&_span]:truncate',
            isDesktop ? 'min-h-44' : 'min-h-80',
            chartEdgeClassName,
          )}
          color="var(--chart-1)"
          data={chartStages}
          edges="curved"
          formatValue={formatValue}
          gap={2}
          layers={3}
          orientation={isDesktop ? 'horizontal' : 'vertical'}
          showLabels
          showPercentage
          showValues
          sideLabelWidthPercent={isDesktop ? 16 : 28}
          staggerDelay={0.12}
          style={{ height: isDesktop ? '11rem' : '20rem' }}
        />
      ) : (
        <p className={textStyles.mutedP}>{formatValue(0)}</p>
      )}

      {visibleMetrics.length > 0 ? (
        <dl className="grid min-w-0 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleMetrics.map((metric) => (
            <MetricSummaryEntry
              className="border-t-0"
              detail={metric.detail}
              icon={metric.icon}
              iconClassName={metric.iconClassName}
              key={metric.label}
              label={metric.label}
              value={formatValue(metric.value)}
            />
          ))}
        </dl>
      ) : null}
    </div>
  );
}
