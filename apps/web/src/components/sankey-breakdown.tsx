"use client";

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Layer,
  Rectangle,
  Sankey,
  type SankeyData,
  type SankeyNodeProps,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { MetricSummaryEntry } from '@/components/metric-summary-entry';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export type SankeyBreakdownNode = {
  color: string;
  displayValue?: number;
  name: string;
};

export type SankeyBreakdownLink = {
  source: number;
  target: number;
  value: number;
};

export type SankeyBreakdownSummaryItem = {
  detail?: ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  label: string;
  value: number;
};

export function SankeyBreakdown({
  className,
  description,
  links,
  nodes,
  showHeader = true,
  showTooltip = true,
  summary,
  title,
}: {
  className?: string;
  description?: string;
  links: SankeyBreakdownLink[];
  nodes: SankeyBreakdownNode[];
  showHeader?: boolean;
  showTooltip?: boolean;
  summary: SankeyBreakdownSummaryItem[];
  title: string;
}) {
  const chartConfig = {
    flow: {
      color: 'var(--chart-2)',
      label: title,
    },
  } satisfies ChartConfig;
  const data = toRenderableSankeyData(nodes, links);

  return (
    <div className={cn('grid gap-4', className)}>
      {showHeader ? (
        <div className="grid gap-1">
          <h3 className={textStyles.itemTitle}>{title}</h3>
          {description ? (
            <p className={textStyles.mutedBody}>{description}</p>
          ) : null}
        </div>
      ) : null}

      <div className="sr-only">
        <p>{title}</p>
        <dl>
          {summary.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{formatCount(item.value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-3">
        <dl className="grid grid-cols-2 gap-x-4 sm:hidden">
          {summary.map((item, index) => (
            <MetricSummaryEntry
              className={cn(index < 2 && 'border-t-0 pt-0')}
              icon={item.icon}
              iconClassName={item.iconClassName}
              key={item.label}
              label={item.label}
              value={formatCount(item.value)}
            />
          ))}
        </dl>

        {data ? (
          <div className="hidden justify-center sm:flex">
            <ChartContainer
              className="h-40 w-full max-w-4xl"
              config={chartConfig}
              initialDimension={{ width: 760, height: 148 }}
            >
              <Sankey
                align="justify"
                data={data}
                iterations={48}
                link={{ stroke: 'var(--chart-2)', strokeOpacity: 0.22 }}
                linkCurvature={0.55}
                margin={{ bottom: 8, left: 124, right: 96, top: 8 }}
                node={SankeyNode}
                nodePadding={14}
                nodeWidth={10}
                sort={false}
              >
                {showTooltip ? (
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel indicator="line" />}
                  />
                ) : null}
              </Sankey>
            </ChartContainer>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SankeyNode(props: SankeyNodeProps) {
  return <SankeyNodeContent {...props} />;
}

function SankeyNodeContent({
  height,
  payload,
  width,
  x,
  y,
}: SankeyNodeProps) {
  const node = payload as unknown as SankeyBreakdownNode & {
    sourceNodes?: number[];
    targetNodes?: number[];
    value?: number;
  };
  const isSource = (node.sourceNodes?.length ?? 0) === 0;
  const textX = isSource ? x - 10 : x + width + 10;
  const textAnchor = isSource ? 'end' : 'start';
  const value =
    typeof node.displayValue === 'number'
      ? node.displayValue
      : typeof node.value === 'number'
        ? node.value
        : null;

  return (
    <Layer>
      <Rectangle
        fill={node.color}
        fillOpacity={1}
        height={height}
        radius={3}
        width={width}
        x={x}
        y={y}
      />
      <text
        className={cn('fill-foreground', textStyles.itemTitle)}
        dominantBaseline="middle"
        textAnchor={textAnchor}
        x={textX}
        y={y + height / 2 - (value === null ? 0 : 7)}
      >
        {node.name}
      </text>
      {value !== null ? (
        <text
          className={cn('fill-muted-foreground', textStyles.meta)}
          dominantBaseline="middle"
          textAnchor={textAnchor}
          x={textX}
          y={y + height / 2 + 8}
        >
          {formatCount(value)}
        </text>
      ) : null}
    </Layer>
  );
}

function toRenderableSankeyData(
  nodes: SankeyBreakdownNode[],
  links: SankeyBreakdownLink[],
): SankeyData | null {
  const activeLinks = links.filter((link) => link.value > 0);
  const totalValue = activeLinks.reduce((total, link) => total + link.value, 0);

  if (totalValue === 0) {
    return null;
  }

  const activeNodeIndexes = new Set<number>();

  for (const link of activeLinks) {
    activeNodeIndexes.add(link.source);
    activeNodeIndexes.add(link.target);
  }

  const indexMap = new Map<number, number>();
  const activeNodes = nodes.flatMap((node, index) => {
    if (!activeNodeIndexes.has(index)) {
      return [];
    }

    indexMap.set(index, indexMap.size);
    return [node];
  });

  return {
    links: activeLinks.map((link) => ({
      source: indexMap.get(link.source) ?? link.source,
      target: indexMap.get(link.target) ?? link.target,
      value: link.value,
    })),
    nodes: activeNodes,
  };
}

const countFormatter = new Intl.NumberFormat();

function formatCount(value: number) {
  return countFormatter.format(value);
}
