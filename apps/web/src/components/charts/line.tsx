"use client";

import { chartCssVars } from "./chart-context";
import { Area, type AreaProps } from "./area";

export interface LineProps
  extends Omit<
    AreaProps,
    "fill" | "fillOpacity" | "gradientToOpacity" | "showLine"
  > {
  /** Stroke color for the line. Default: var(--chart-line-primary) */
  stroke?: string;
}

export function Line({
  stroke = chartCssVars.linePrimary,
  strokeWidth = 2,
  ...props
}: LineProps) {
  return (
    <Area
      {...props}
      fill={stroke}
      fillOpacity={0}
      gradientToOpacity={0}
      showLine
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

Line.displayName = "Line";

export default Line;
