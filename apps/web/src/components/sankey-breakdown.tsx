"use client";

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useLocale } from 'next-intl';
import {
  SankeyChart,
  type SankeyData,
  SankeyLink,
  type SankeyLinkDatum,
  type SankeyNodeDatum,
  SankeyTooltip,
  useSankey,
} from '@/components/charts/sankey';
import { useMediaQuery } from '@/hooks/use-media-query';
import { getIntlLocale } from '@/lib/locale-format';
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
  const data = toRenderableSankeyData(nodes, links);
  const shouldRenderDesktopChart = useMediaQuery('(min-width: 640px)');
  const locale = useLocale();
  const formatValue = (value: number) => formatCount(value, locale);
  const margin = shouldRenderDesktopChart
    ? { bottom: 16, left: 160, right: 160, top: 16 }
    : { bottom: 8, left: 88, right: 88, top: 8 };

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
              <dd>{formatCount(item.value, locale)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {data && !shouldRenderDesktopChart ? (
        <CompactSankeyFlow
          data={data}
          formatValue={formatValue}
          summary={summary}
        />
      ) : null}

      {data && shouldRenderDesktopChart ? (
        <div className="flex justify-center overflow-visible">
          <SankeyChart
            animationDuration={800}
            aspectRatio={shouldRenderDesktopChart ? '5 / 1' : '1 / 1.05'}
            className="w-full max-w-5xl"
            data={data}
            margin={margin}
            nodePadding={shouldRenderDesktopChart ? 14 : 8}
            nodeWidth={10}
          >
            <SankeyLink
              fadedOpacity={0.08}
              getNodeColor={getNodeColor}
              strokeOpacity={0.36}
            />
            <RetainoSankeyNode
              fadedOpacity={0.32}
              formatValue={formatValue}
              getNodeColor={getNodeColor}
              lineCap={3}
            />
            {showTooltip ? (
              <SankeyTooltip
                formatValue={formatValue}
                linkContent={({ link }) => (
                  <RetainoSankeyTooltipContent
                    color="var(--chart-foreground-muted)"
                    title={`${nodeName(link.source)} / ${nodeName(link.target)}`}
                    value={formatValue(link.value)}
                  />
                )}
                nodeContent={({ node }) => (
                  <RetainoSankeyTooltipContent
                    color={getNodeColor(node)}
                    title={node.name}
                    value={formatValue(displayNodeValue(node))}
                  />
                )}
              />
            ) : null}
          </SankeyChart>
        </div>
      ) : null}
    </div>
  );
}

function RetainoSankeyNode({
  fadedOpacity,
  formatValue,
  getNodeColor,
  lineCap,
}: {
  fadedOpacity: number;
  formatValue: (value: number) => string;
  getNodeColor: (node: SankeyNodeDatum) => string;
  lineCap: number;
}) {
  const {
    innerHeight,
    links,
    margin,
    nodes,
    hoveredLinkIndex,
    hoveredNodeIndex,
    setHoveredNodeIndex,
    setTooltipData,
  } = useSankey();
  const isAnyHovered = hoveredNodeIndex !== null || hoveredLinkIndex !== null;
  const labelGap = 10;
  const labelHeight = 30;
  const leftLabelWidth = Math.max(88, margin.left - labelGap - 8);
  const rightLabelWidth = Math.max(88, margin.right - labelGap - 8);

  return (
    <g className="sankey-nodes">
      {nodes.map((node, index) => {
        const nodeX = node.x0 ?? 0;
        const nodeY = node.y0 ?? 0;
        const nodeWidth = (node.x1 ?? 0) - nodeX;
        const nodeHeight = (node.y1 ?? 0) - nodeY;
        const isSource = !links.some(
          (link) => getNodeIndex(link.target) === index,
        );
        const labelWidth = isSource ? leftLabelWidth : rightLabelWidth;
        const labelX = isSource
          ? nodeX - labelGap - labelWidth
          : nodeX + nodeWidth + labelGap;
        const labelY = clamp(
          nodeY + nodeHeight / 2 - labelHeight / 2,
          -margin.top + 2,
          innerHeight + margin.bottom - labelHeight - 2,
        );
        const isConnected = isNodeConnected({
          hoveredLinkIndex,
          hoveredNodeIndex,
          links,
          nodeIndex: index,
        });
        const opacity = isAnyHovered && !isConnected ? fadedOpacity : 1;

        return (
          <g
            key={`node-${node.name}`}
            onMouseEnter={() => {
              setHoveredNodeIndex(index);
              setTooltipData({
                data: node,
                nodeIndex: index,
                type: 'node',
                x: 0,
                y: 0,
              });
            }}
            onMouseLeave={() => {
              setHoveredNodeIndex(null);
              setTooltipData(null);
            }}
            style={{ cursor: 'pointer', opacity }}
          >
            <rect
              fill={getNodeColor(node)}
              height={nodeHeight}
              rx={lineCap}
              ry={lineCap}
              width={nodeWidth}
              x={nodeX}
              y={nodeY}
            />
            <foreignObject
              height={labelHeight}
              width={labelWidth}
              x={labelX}
              y={labelY}
            >
              <div
                className={cn(
                  'flex size-full min-w-0 flex-col justify-center overflow-hidden text-foreground',
                  isSource ? 'items-end text-right' : 'items-start',
                )}
              >
                <span className="max-w-full truncate font-medium text-[11px] leading-tight">
                  {node.name}
                </span>
                <span className="font-medium text-[10px] leading-none text-muted-foreground tabular-nums">
                  {formatValue(displayNodeValue(node))}
                </span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}

function CompactSankeyFlow({
  data,
  formatValue,
  summary,
}: {
  data: SankeyData;
  formatValue: (value: number) => string;
  summary: SankeyBreakdownSummaryItem[];
}) {
  const summaryByLabel = new Map(summary.map((item) => [item.label, item]));
  const rows = compactFlowRows(data);

  return (
    <div className="grid sm:hidden">
      {rows.map((row) => {
        const node = data.nodes[row.nodeIndex];
        const item = node ? summaryByLabel.get(node.name) : undefined;

        if (!node) {
          return null;
        }

        return (
          <div
            className="grid min-h-11 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-t border-border py-2 first:border-t-0"
            key={row.key}
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: getNodeColor(node) }}
            />
            <div className="min-w-0">
              <p className={cn('truncate', textStyles.itemTitle)}>
                {node.name}
              </p>
              {item?.detail ? (
                <p className={textStyles.meta}>{item.detail}</p>
              ) : null}
            </div>
            <p className={cn(textStyles.numericInline, 'text-right')}>
              {formatValue(mobileNodeValue(node, data.links, row.nodeIndex))}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function compactFlowRows(data: SankeyData) {
  const outgoingByNode = new Map<number, SankeyLinkDatum[]>();
  const incomingNodeIndexes = new Set<number>();

  data.links.forEach((link) => {
    const outgoing = outgoingByNode.get(link.source) ?? [];
    outgoing.push(link);
    outgoingByNode.set(link.source, outgoing);
    incomingNodeIndexes.add(link.target);
  });

  for (const links of outgoingByNode.values()) {
    links.sort((a, b) => b.value - a.value);
  }

  const sourceIndexes = data.nodes
    .map((_node, index) => index)
    .filter((index) => !incomingNodeIndexes.has(index));
  const roots = sourceIndexes.length > 0
    ? sourceIndexes
    : data.nodes.map((_node, index) => index);
  const rows: Array<{ key: string; nodeIndex: number }> = [];
  const visitedEdges = new Set<string>();

  function visit(nodeIndex: number, path: string) {
    rows.push({ key: `${path}-${nodeIndex}`, nodeIndex });

    for (const link of outgoingByNode.get(nodeIndex) ?? []) {
      const edgeKey = `${link.source}-${link.target}`;

      if (visitedEdges.has(edgeKey)) {
        continue;
      }

      visitedEdges.add(edgeKey);
      visit(link.target, `${path}-${link.target}`);
    }
  }

  roots.forEach((index) => visit(index, `root-${index}`));

  return rows;
}

function mobileNodeValue(
  node: SankeyNodeDatum,
  links: SankeyLinkDatum[],
  nodeIndex: number,
) {
  if (typeof node.displayValue === 'number') {
    return node.displayValue;
  }

  const incoming = links
    .filter((link) => link.target === nodeIndex)
    .reduce((total, link) => total + link.value, 0);

  if (incoming > 0) {
    return incoming;
  }

  return links
    .filter((link) => link.source === nodeIndex)
    .reduce((total, link) => total + link.value, 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function RetainoSankeyTooltipContent({
  color,
  title,
  value,
}: {
  color: string;
  title: string;
  value: string;
}) {
  return (
    <div className="min-w-[140px] px-3 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-chart-tooltip-muted text-sm">{title}</span>
        </div>
        <span className="font-medium text-chart-tooltip-foreground text-sm tabular-nums">
          {value}
        </span>
      </div>
    </div>
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
  const incomingNodeIndexes = new Set<number>();
  const outgoingNodeIndexes = new Set<number>();

  for (const link of activeLinks) {
    activeNodeIndexes.add(link.source);
    activeNodeIndexes.add(link.target);
    incomingNodeIndexes.add(link.target);
    outgoingNodeIndexes.add(link.source);
  }

  const indexMap = new Map<number, number>();
  const activeNodes = nodes.flatMap((node, index) => {
    if (!activeNodeIndexes.has(index)) {
      return [];
    }

    indexMap.set(index, indexMap.size);
    return [
      {
        ...node,
        category: nodeCategory(index, incomingNodeIndexes, outgoingNodeIndexes),
      },
    ];
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

function nodeCategory(
  index: number,
  incomingNodeIndexes: Set<number>,
  outgoingNodeIndexes: Set<number>,
): SankeyNodeDatum['category'] {
  if (!incomingNodeIndexes.has(index)) {
    return 'source';
  }

  if (!outgoingNodeIndexes.has(index)) {
    return 'outcome';
  }

  return 'landing';
}

function getNodeColor(node: SankeyNodeDatum) {
  return typeof node.color === 'string' ? node.color : 'var(--chart-2)';
}

function displayNodeValue(node: SankeyNodeDatum) {
  if (typeof node.displayValue === 'number') {
    return node.displayValue;
  }

  if (typeof node.value === 'number') {
    return node.value;
  }

  return 0;
}

function nodeName(nodeOrIndex: unknown) {
  if (
    nodeOrIndex &&
    typeof nodeOrIndex === 'object' &&
    'name' in nodeOrIndex &&
    typeof nodeOrIndex.name === 'string'
  ) {
    return nodeOrIndex.name;
  }

  return '';
}

function isNodeConnected({
  hoveredLinkIndex,
  hoveredNodeIndex,
  links,
  nodeIndex,
}: {
  hoveredLinkIndex: number | null;
  hoveredNodeIndex: number | null;
  links: Array<SankeyLinkDatum & { source: unknown; target: unknown }>;
  nodeIndex: number;
}) {
  if (hoveredNodeIndex !== null) {
    if (hoveredNodeIndex === nodeIndex) {
      return true;
    }

    return links.some((link) => {
      const sourceIndex = getNodeIndex(link.source);
      const targetIndex = getNodeIndex(link.target);

      return (
        (sourceIndex === hoveredNodeIndex && targetIndex === nodeIndex) ||
        (targetIndex === hoveredNodeIndex && sourceIndex === nodeIndex)
      );
    });
  }

  if (hoveredLinkIndex !== null) {
    const link = links[hoveredLinkIndex];

    if (!link) {
      return false;
    }

    return (
      getNodeIndex(link.source) === nodeIndex ||
      getNodeIndex(link.target) === nodeIndex
    );
  }

  return false;
}

function getNodeIndex(nodeOrIndex: unknown) {
  if (typeof nodeOrIndex === 'number') {
    return nodeOrIndex;
  }

  if (
    nodeOrIndex &&
    typeof nodeOrIndex === 'object' &&
    'index' in nodeOrIndex &&
    typeof nodeOrIndex.index === 'number'
  ) {
    return nodeOrIndex.index;
  }

  return undefined;
}

function formatCount(value: number, locale: string) {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}
