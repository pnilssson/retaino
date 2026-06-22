"use client";

import { memo, useMemo } from "react";
import {
  chartCssVars,
  useChartHover,
  useChartStable,
} from "./chart-context";
import { computeSeriesBarWidth } from "./series-bar-layout";

export interface SeriesBarProps {
  /** Key in data to use for bar values. */
  dataKey: string;
  /** Fill color for the bars. Default: var(--chart-line-primary) */
  fill?: string;
  /** Bar opacity when active. Default: 0.75 */
  fillOpacity?: number;
  /** Bar opacity while another point is hovered. Default: 0.28 */
  fadedOpacity?: number;
  /** Rounded corner radius in px. Default: 0 */
  radius?: number;
  /** Minimum visible height for positive values. Default: 2 */
  minBarHeight?: number;
}

export const SeriesBar = memo(function SeriesBar({
  dataKey,
  fill = chartCssVars.linePrimary,
  fillOpacity = 0.75,
  fadedOpacity = 0.28,
  radius = 0,
  minBarHeight = 2,
}: SeriesBarProps) {
  const {
    columnWidth,
    composedBarDataKeys,
    composedBarGap = 4,
    composedBarSize,
    composedMaxBarSize,
    composedStacked,
    composedStackOffsets,
    data,
    innerWidth,
    xAccessor,
    xScale,
    yScale,
  } = useChartStable();
  const { selection, tooltipData } = useChartHover();
  const barKeys = composedBarDataKeys?.length
    ? composedBarDataKeys
    : [dataKey];
  const barIndex = Math.max(0, barKeys.indexOf(dataKey));
  const barWidth = useMemo(
    () =>
      computeSeriesBarWidth({
        columnWidth,
        composedBarGap,
        composedBarSize,
        composedMaxBarSize,
        dataLength: data.length,
        innerWidth,
        seriesCount: barKeys.length,
        stacked: composedStacked,
      }),
    [
      barKeys.length,
      columnWidth,
      composedBarGap,
      composedBarSize,
      composedMaxBarSize,
      composedStacked,
      data.length,
      innerWidth,
    ],
  );
  const hoverIndex = tooltipData?.index ?? null;
  const isHovering = hoverIndex !== null || selection?.active === true;
  const groupWidth = composedStacked
    ? barWidth
    : barKeys.length * barWidth + (barKeys.length - 1) * composedBarGap;

  return (
    <g>
      {data.map((point, index) => {
        const rawValue = point[dataKey];
        if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
          return null;
        }

        const value = Math.max(0, rawValue);
        const offset =
          composedStackOffsets?.get(index)?.get(dataKey) ??
          0;
        const centerX = xScale(xAccessor(point)) ?? 0;
        const x = composedStacked
          ? centerX - barWidth / 2
          : centerX - groupWidth / 2 + barIndex * (barWidth + composedBarGap);
        const baselineY = yScale(offset) ?? 0;
        let y = yScale(offset + value) ?? baselineY;
        let height = Math.max(0, baselineY - y);

        if (Math.sign(value) === 1 && height < minBarHeight) {
          height = minBarHeight;
          y = baselineY - minBarHeight;
        }

        const opacity =
          isHovering && hoverIndex !== index ? fadedOpacity : fillOpacity;

        return (
          <rect
            fill={fill}
            height={height}
            key={`${dataKey}-${String(point.date ?? index)}-${index}`}
            opacity={opacity}
            rx={radius}
            ry={radius}
            style={{ transition: "opacity 0.18s ease-in-out" }}
            width={barWidth}
            x={x}
            y={y}
          />
        );
      })}
    </g>
  );
});

SeriesBar.displayName = "SeriesBar";

export default SeriesBar;
