"use client";

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
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export type SankeyBreakdownNode = {
  color: string;
  name: string;
};

export type SankeyBreakdownLink = {
  source: number;
  target: number;
  value: number;
};

export type SankeyBreakdownSummaryItem = {
  label: string;
  value: number;
};

export function SankeyBreakdown({
  className,
  description,
  links,
  nodes,
  showHeader = true,
  summary,
  title,
}: {
  className?: string;
  description?: string;
  links: SankeyBreakdownLink[];
  nodes: SankeyBreakdownNode[];
  showHeader?: boolean;
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

      {data ? (
        <ChartContainer
          className="h-64 w-full sm:h-72"
          config={chartConfig}
          initialDimension={{ width: 520, height: 260 }}
        >
          <Sankey
            align="justify"
            data={data}
            iterations={48}
            link={{ stroke: 'var(--chart-2)', strokeOpacity: 0.22 }}
            linkCurvature={0.55}
            margin={{ bottom: 24, left: 128, right: 128, top: 24 }}
            node={SankeyNode}
            nodePadding={22}
            nodeWidth={10}
            sort={false}
          >
            <ChartTooltip
              content={<ChartTooltipContent hideLabel indicator="line" />}
            />
          </Sankey>
        </ChartContainer>
      ) : null}
    </div>
  );
}

function SankeyNode({ height, payload, width, x, y }: SankeyNodeProps) {
  const node = payload as unknown as SankeyBreakdownNode & {
    sourceNodes?: number[];
    targetNodes?: number[];
    value?: number;
  };
  const isSource = (node.sourceNodes?.length ?? 0) === 0;
  const textX = isSource ? x - 10 : x + width + 10;
  const textAnchor = isSource ? 'end' : 'start';
  const value = typeof node.value === 'number' ? node.value : null;

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
        className="fill-foreground text-[11px] font-medium"
        dominantBaseline="middle"
        textAnchor={textAnchor}
        x={textX}
        y={y + height / 2 - (value === null ? 0 : 7)}
      >
        {node.name}
      </text>
      {value !== null ? (
        <text
          className="fill-muted-foreground text-[11px]"
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

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}
