"use client";

import { ParentSize } from "@visx/responsive";
import type { Transition } from "motion/react";
import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { Area, type AreaProps } from "./area";
import type { LineConfig, Margin } from "./chart-context";
import { ChartLoadingLabel } from "./chart-loading-label";
import {
  type ChartPhase,
  type ChartStatus,
  DEFAULT_CHART_STATUS,
  DEFAULT_Y_DOMAIN_TWEEN_MS,
  resolveRestingChartPhase,
} from "./chart-phase";
import { forEachChartChild } from "./chart-child-passthrough";
import { Line, type LineProps } from "./line";
import { PatternArea } from "./pattern-area";
import { SeriesBar, type SeriesBarProps } from "./series-bar";
import { TimeSeriesChartInner } from "./time-series-chart-shell";
import { XAxis } from "./x-axis";

export interface ComposedChartProps {
  /** Data array - each item should have a date field and numeric values */
  data: Record<string, unknown>[];
  /** Key in data for the x-axis (date). Default: "date" */
  xDataKey?: string;
  /** Chart margins */
  margin?: Partial<Margin>;
  /** Animation duration in milliseconds. Default: 1100 */
  animationDuration?: number;
  /** CSS easing for clip-reveal. */
  animationEasing?: string;
  /** Motion enter transition (spring or cubic-bezier tween). */
  enterTransition?: Transition;
  /** Signature of motion URL state - triggers reveal replay when it changes. */
  revealSignature?: string;
  /** Aspect ratio as "width / height". Default: "2 / 1" */
  aspectRatio?: string;
  /** Additional class name for the container */
  className?: string;
  /** Loading vs ready - drives chart phase and loading chrome. */
  status?: ChartStatus;
  /** Centered shimmer label while loading. */
  loadingLabel?: string;
  /** Animate y-domain over this duration (ms) on status transitions. */
  yDomainTweenDuration?: number;
  /** Animate y-domain when status or target domain changes. Default: true */
  yDomainTween?: boolean;
  /** Inline container styles. */
  style?: CSSProperties;
  /** Fires when the internal chart phase changes. */
  onPhaseChange?: (phase: ChartPhase) => void;
  /** Target bar width in px. */
  barSize?: number;
  /** Max bar width in px. */
  maxBarSize?: number;
  /** Gap between grouped bar series in px. Default: 4 */
  barGap?: number;
  /** Stack SeriesBar segments at each x. Default: false */
  stacked?: boolean;
  /** Vertical gap between stacked segments in px. Reserved for bklit parity. */
  stackGap?: number;
  /** Child components (Area, Line, SeriesBar, Grid, XAxis, ChartTooltip, etc.) */
  children: ReactNode;
}

const DEFAULT_MARGIN: Margin = { top: 40, right: 40, bottom: 40, left: 40 };

function chartChildName(childType: unknown) {
  const type = childType as {
    displayName?: string;
    name?: string;
  };

  return typeof childType === "function"
    ? type.displayName || type.name || ""
    : "";
}

function extractComposedConfigs(children: ReactNode): {
  barDataKeys: string[];
  lines: LineConfig[];
} {
  const barDataKeys: string[] = [];
  const lines: LineConfig[] = [];

  forEachChartChild(children, (child) => {
    const componentName = chartChildName(child.type);
    const props = child.props as
      | AreaProps
      | LineProps
      | SeriesBarProps
      | undefined;
    const isPatternArea =
      componentName === "PatternArea" || child.type === PatternArea;
    const isArea = componentName === "Area" || child.type === Area;
    const isLine = componentName === "Line" || child.type === Line;
    const isSeriesBar =
      componentName === "SeriesBar" || child.type === SeriesBar;

    if (!props?.dataKey || isPatternArea) {
      return;
    }

    if (isSeriesBar) {
      barDataKeys.push(props.dataKey);
      lines.push({
        dataKey: props.dataKey,
        stroke: (props as SeriesBarProps).fill ?? "var(--chart-line-primary)",
        strokeWidth: 2,
      });
      return;
    }

    if (isArea || isLine) {
      const areaProps = props as AreaProps;
      lines.push({
        dataKey: props.dataKey,
        stroke:
          areaProps.stroke ||
          areaProps.fill ||
          "var(--chart-line-primary)",
        strokeWidth: areaProps.strokeWidth || 2,
        yAxisId: areaProps.yAxisId,
      });
    }
  });

  return { barDataKeys, lines };
}

function buildStackOffsets(
  data: Record<string, unknown>[],
  barDataKeys: string[],
) {
  const offsets = new Map<number, Map<string, number>>();
  let maxTotal = 0;

  data.forEach((row, index) => {
    const rowOffsets = new Map<string, number>();
    let total = 0;

    for (const dataKey of barDataKeys) {
      rowOffsets.set(dataKey, total);
      const value = row[dataKey];
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        total += value;
      }
    }

    maxTotal = Math.max(maxTotal, total);
    offsets.set(index, rowOffsets);
  });

  return { maxTotal, offsets };
}

interface ChartInnerProps {
  animationDuration: number;
  animationEasing?: string;
  barGap?: number;
  barSize?: number;
  chartStatus: ChartStatus;
  children: ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  data: Record<string, unknown>[];
  enterTransition?: Transition;
  height: number;
  loadingLabel?: string;
  margin: Margin;
  maxBarSize?: number;
  onPhaseChange: (phase: ChartPhase) => void;
  revealSignature?: string;
  stackGap?: number;
  stacked: boolean;
  width: number;
  xDataKey: string;
  yDomainTween: boolean;
  yDomainTweenDuration: number;
}

function ChartInner({
  animationDuration,
  animationEasing,
  barGap,
  barSize,
  chartStatus,
  children,
  containerRef,
  data,
  enterTransition,
  height,
  loadingLabel,
  margin,
  maxBarSize,
  onPhaseChange,
  revealSignature,
  stackGap,
  stacked,
  width,
  xDataKey,
  yDomainTween,
  yDomainTweenDuration,
}: ChartInnerProps) {
  const { barDataKeys, lines } = useMemo(
    () => extractComposedConfigs(children),
    [children],
  );
  const stack = useMemo(
    () =>
      stacked
        ? buildStackOffsets(data, barDataKeys)
        : { maxTotal: undefined, offsets: undefined },
    [barDataKeys, data, stacked],
  );

  return (
    <TimeSeriesChartInner
      animationDuration={animationDuration}
      animationEasing={animationEasing}
      chartStatus={chartStatus}
      clipPathId="chart-composed-grow-clip"
      composedBarDataKeys={barDataKeys}
      composedBarGap={barGap}
      composedBarSize={barSize}
      composedMaxBarSize={maxBarSize}
      composedStacked={stacked}
      composedStackGap={stackGap}
      composedStackOffsets={stack.offsets}
      containerRef={containerRef}
      data={data}
      enterTransition={enterTransition}
      height={height}
      lines={lines}
      loadingLabel={loadingLabel}
      margin={margin}
      onPhaseChange={onPhaseChange}
      revealSignature={revealSignature}
      width={width}
      xDataKey={xDataKey}
      yDomainTween={yDomainTween}
      yDomainTweenDuration={yDomainTweenDuration}
      yScaleDomainMax={stack.maxTotal}
    >
      {children}
    </TimeSeriesChartInner>
  );
}

export function ComposedChart({
  animationDuration = 1100,
  animationEasing,
  aspectRatio = "2 / 1",
  barGap = 4,
  barSize,
  children,
  className = "",
  data,
  enterTransition,
  loadingLabel,
  margin: marginProp,
  maxBarSize,
  onPhaseChange,
  revealSignature,
  stackGap = 0,
  stacked = false,
  status = DEFAULT_CHART_STATUS,
  style,
  xDataKey = "date",
  yDomainTween = true,
  yDomainTweenDuration = DEFAULT_Y_DOMAIN_TWEEN_MS,
}: ComposedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const margin = { ...DEFAULT_MARGIN, ...marginProp };
  const [chartPhase, setChartPhase] = useState<ChartPhase>(() =>
    resolveRestingChartPhase(status),
  );
  const handlePhaseChange = useCallback(
    (phase: ChartPhase) => {
      setChartPhase(phase);
      onPhaseChange?.(phase);
    },
    [onPhaseChange],
  );

  const showLoadingLabel = Boolean(
    loadingLabel?.trim() &&
      (chartPhase === "loading" ||
        chartPhase === "exiting" ||
        chartPhase === "gridTweenReady" ||
        chartPhase === "revealingLoading"),
  );

  return (
    <div
      className={cn("relative w-full", className)}
      ref={containerRef}
      style={{ aspectRatio, touchAction: "none", ...style }}
    >
      <ParentSize debounceTime={10}>
        {({ width, height }) => (
          <ChartInner
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            barGap={barGap}
            barSize={barSize}
            chartStatus={status}
            containerRef={containerRef}
            data={data}
            enterTransition={enterTransition}
            height={height}
            loadingLabel={loadingLabel}
            margin={margin}
            maxBarSize={maxBarSize}
            onPhaseChange={handlePhaseChange}
            revealSignature={revealSignature}
            stackGap={stackGap}
            stacked={stacked}
            width={width}
            xDataKey={xDataKey}
            yDomainTween={yDomainTween}
            yDomainTweenDuration={yDomainTweenDuration}
          >
            {children}
          </ChartInner>
        )}
      </ParentSize>
      {showLoadingLabel ? (
        <ChartLoadingLabel
          exiting={chartPhase !== "loading"}
          text={loadingLabel}
        />
      ) : null}
    </div>
  );
}

ComposedChart.displayName = "ComposedChart";

export { Area, type AreaProps } from "./area";
export { Line, type LineProps } from "./line";
export { SeriesBar, type SeriesBarProps } from "./series-bar";
export { XAxis, type XAxisProps } from "./x-axis";

export default ComposedChart;
