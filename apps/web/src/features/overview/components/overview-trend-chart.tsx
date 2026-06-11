"use client";

import type { OverviewResponse } from '@retaino/shared/contracts';
import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { useLocale } from 'next-intl';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import {
  formatOverviewCurrency,
  formatOverviewDate,
  formatOverviewNumber,
} from '../overview-format';

const chartConfig = {
  deliveredSmsTrendValue: {
    color: 'var(--chart-2)',
    label: 'Delivered SMS',
  },
  bookingTrendValue: {
    color: 'var(--chart-1)',
    label: 'Reported bookings',
  },
  revenueTrendValue: {
    color: 'var(--chart-3)',
    label: 'Reported revenue',
  },
} satisfies ChartConfig;

const overviewGridTicks = [0, 25, 50, 75, 100];

export function OverviewTrendChart({
  currency,
  hasMixedCurrencies,
  trend,
}: {
  currency: string;
  hasMixedCurrencies: boolean;
  trend: OverviewResponse['trend'];
}) {
  const locale = useLocale();
  const totals = React.useMemo(
    () => ({
      reportedBookingCount: trend.reduce(
        (total, entry) => total + entry.reportedBookingCount,
        0,
      ),
      deliveredSmsCount: trend.reduce(
        (total, entry) => total + entry.deliveredSmsCount,
        0,
      ),
      reportedRevenueAmountMinor: hasMixedCurrencies
        ? null
        : trend.reduce(
            (total, entry) =>
              total + (entry.reportedRevenueAmountMinor ?? 0),
            0,
          ),
    }),
    [hasMixedCurrencies, trend],
  );
  const chartData = React.useMemo(() => {
    const maxBookings = Math.max(
      ...trend.map((entry) => entry.reportedBookingCount),
      0,
    );
    const maxDeliveredSms = Math.max(
      ...trend.map((entry) => entry.deliveredSmsCount),
      0,
    );
    const maxRevenue = hasMixedCurrencies
      ? 0
      : Math.max(
          ...trend.map((entry) => entry.reportedRevenueAmountMinor ?? 0),
          0,
        );

    return trend.map((entry) => ({
      ...entry,
      bookingTrendValue:
        maxBookings > 0
          ? (entry.reportedBookingCount / maxBookings) * 100
          : 0,
      deliveredSmsTrendValue:
        maxDeliveredSms > 0
          ? (entry.deliveredSmsCount / maxDeliveredSms) * 100
          : 0,
      reportedRevenueAmountMinor: hasMixedCurrencies
        ? null
        : entry.reportedRevenueAmountMinor,
      revenueTrendValue:
        !hasMixedCurrencies && maxRevenue > 0
          ? ((entry.reportedRevenueAmountMinor ?? 0) / maxRevenue) * 100
          : null,
    }));
  }, [hasMixedCurrencies, trend]);
  const options: Array<{
    label: string;
    value: string;
  }> = [
    {
      label: 'Delivered SMS',
      value: formatOverviewNumber(totals.deliveredSmsCount, locale),
    },
    {
      label: 'Bookings',
      value: formatOverviewNumber(totals.reportedBookingCount, locale),
    },
    {
      label: 'Revenue',
      value: hasMixedCurrencies
        ? 'Mixed'
        : formatOverviewCurrency(
            totals.reportedRevenueAmountMinor,
            currency,
            locale,
          ),
    },
  ];

  return (
    <div className="grid gap-0 py-4 sm:py-0">
      <div className="flex flex-col items-stretch border-b p-0 md:flex-row">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-6 pb-3 md:pb-0">
          <h2 className={textStyles.sectionTitle}>Campaign results</h2>
          <p
            className={cn(
              'max-w-prose whitespace-normal',
              textStyles.mutedBody,
            )}
          >
            Delivered SMS, reported bookings, and reported revenue.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(150px,150px)_minmax(150px,150px)_minmax(220px,1fr)]">
          {options.map((option) => (
            <div
              className="flex flex-col justify-center gap-1 border-t px-6 py-4 text-left md:border-t-0 md:border-l md:px-8 md:py-6"
              key={option.label}
            >
              <span className={cn(textStyles.meta, 'whitespace-nowrap')}>
                {option.label}
              </span>
              <span className={cn(textStyles.numeric, 'leading-none')}>
                {option.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden px-1 pt-5 pb-3 sm:px-6 sm:py-7">
        <ChartContainer
          className="h-[300px] w-full sm:h-[290px]"
          config={chartConfig}
          initialDimension={{ width: 360, height: 300 }}
        >
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{ bottom: 24, left: 6, right: 18, top: 4 }}
          >
            <defs>
              <linearGradient
                id="fillOverviewDeliveredSms"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-deliveredSmsTrendValue)"
                  stopOpacity={0.45}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-deliveredSmsTrendValue)"
                  stopOpacity={0.08}
                />
              </linearGradient>
              <linearGradient
                id="fillOverviewBookings"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-bookingTrendValue)"
                  stopOpacity={0.55}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-bookingTrendValue)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id="fillOverviewRevenue"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-revenueTrendValue)"
                  stopOpacity={0.45}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-revenueTrendValue)"
                  stopOpacity={0.08}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={48}
              padding={{ left: 10, right: 18 }}
              tickFormatter={(value) => formatOverviewDate(value, locale)}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis domain={[0, 100]} hide ticks={overviewGridTicks} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="w-44"
                  formatter={(_value, name, _item, _index, payload) => {
                    const row = payload as {
                      deliveredSmsCount?: number;
                      reportedBookingCount?: number;
                      reportedRevenueAmountMinor?: number | null;
                    };
                    const label =
                      name === 'revenueTrendValue'
                        ? 'Reported revenue'
                        : name === 'bookingTrendValue'
                          ? 'Reported bookings'
                          : 'Delivered SMS';
                    const value =
                      name === 'revenueTrendValue'
                        ? formatOverviewCurrency(
                            row.reportedRevenueAmountMinor ?? null,
                            currency,
                            locale,
                          )
                        : name === 'bookingTrendValue'
                          ? formatOverviewNumber(
                              Number(row.reportedBookingCount ?? 0),
                              locale,
                            )
                          : formatOverviewNumber(
                              Number(row.deliveredSmsCount ?? 0),
                              locale,
                            );

                    return (
                      <>
                        <span className="text-muted-foreground">
                          {label}
                        </span>
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {value}
                        </span>
                      </>
                    );
                  }}
                  indicator="dot"
                  labelFormatter={(value) =>
                    formatOverviewDate(String(value), locale)
                  }
                />
              }
            />
            <Area
              dataKey="deliveredSmsTrendValue"
              fill="url(#fillOverviewDeliveredSms)"
              stroke="var(--color-deliveredSmsTrendValue)"
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="bookingTrendValue"
              fill="url(#fillOverviewBookings)"
              stroke="var(--color-bookingTrendValue)"
              strokeWidth={2}
              type="monotone"
            />
            {!hasMixedCurrencies ? (
              <Area
                dataKey="revenueTrendValue"
                fill="url(#fillOverviewRevenue)"
                stroke="var(--color-revenueTrendValue)"
                strokeWidth={2}
                type="monotone"
              />
            ) : null}
            <ChartLegend
              height={56}
              content={
                <ChartLegendContent className="flex-wrap justify-start gap-x-4 gap-y-2 px-3 pt-4 sm:justify-center sm:px-0 sm:pt-3" />
              }
            />
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  );
}
