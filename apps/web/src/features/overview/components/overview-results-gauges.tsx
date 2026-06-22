"use client";

import type { OverviewResponse } from "@retaino/shared/contracts";
import { useLocale, useTranslations } from "next-intl";
import { Gauge } from "@/components/charts/gauge";
import type { ChartStatFlowFormat } from "@/components/charts/chart-stat-flow";
import { ContentSection } from "@/features/appshell/components/content-section";
import { getIntlLocale } from "@/lib/locale-format";

const overviewGaugeColors = {
  deliveredSms: "var(--chart-2)",
  reportedBookings: "var(--chart-2)",
  reportedRevenue: "var(--chart-2)",
} as const;

export function OverviewResultsGauges({
  overview,
}: {
  overview: OverviewResponse;
}) {
  const locale = useLocale();
  const intlLocale = getIntlLocale(locale);
  const t = useTranslations("Overview");
  const deliveryRate = percentage(
    overview.funnel.deliveredCount,
    overview.funnel.sentCount,
  );
  const bookingRate = percentage(
    overview.metrics.reportedBookingCount,
    overview.funnel.deliveredCount,
  );
  const reportedRevenueAmountMinor =
    overview.metrics.reportedRevenueAmountMinor;
  const revenueAmountMajor =
    overview.metrics.reportedRevenueHasMixedCurrencies ||
    reportedRevenueAmountMinor === null
      ? undefined
      : reportedRevenueAmountMinor / 100;
  const hasRevenueTotal = typeof revenueAmountMajor === "number";
  const hasPositiveRevenue =
    typeof revenueAmountMajor === "number" &&
    Math.sign(revenueAmountMajor) === 1;
  const revenueGaugeValue = hasPositiveRevenue ? 100 : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <ResultGaugeSection
        activeFill={overviewGaugeColors.deliveredSms}
        centerValue={overview.funnel.deliveredCount}
        detail={t("deliveryRateGaugeLabel", {
          value: formatPercent(deliveryRate, intlLocale),
        })}
        title={t("deliveredSms")}
        value={deliveryRate}
      />
      <ResultGaugeSection
        activeFill={overviewGaugeColors.reportedBookings}
        centerValue={overview.metrics.reportedBookingCount}
        detail={t("bookingRateGaugeLabel", {
          value: formatPercent(bookingRate, intlLocale),
        })}
        title={t("reportedBookings")}
        value={bookingRate}
      />
      <ResultGaugeSection
        activeFill={overviewGaugeColors.reportedRevenue}
        centerValue={revenueAmountMajor ?? 0}
        detail={t("reportedRevenueGaugeLabel")}
        formatOptions={
          hasRevenueTotal
            ? currencyFormat(overview.metrics.reportedRevenueCurrency)
            : undefined
        }
        title={t("reportedRevenue")}
        value={revenueGaugeValue}
      />
    </div>
  );
}

function ResultGaugeSection({
  activeFill,
  centerValue,
  detail,
  formatOptions,
  title,
  value,
}: {
  activeFill: string;
  centerValue: number;
  detail: string;
  formatOptions?: ChartStatFlowFormat;
  title: string;
  value: number;
}) {
  return (
    <ContentSection
      contentClassName="justify-items-center px-4 py-4"
      title={title}
    >
      <Gauge
        activeFill={activeFill}
        centerValue={centerValue}
        className="w-full max-w-[310px]"
        defaultLabel={detail}
        formatOptions={formatOptions}
        activeFillOpacity={1}
        enterStaggerScale={1}
        inactiveFillOpacity={0.4}
        minWidth={0}
        notchCornerRadius={8}
        notchLengthPercent={100}
        spacing={25}
        totalNotches={40}
        value={value}
      />
    </ContentSection>
  );
}

function percentage(value: number, total: number) {
  return total > 0 ? Math.min((value / total) * 100, 100) : 0;
}

function formatPercent(value: number, locale: string) {
  const showFractionDigit = Math.sign(value) === 1 && value < 1;

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: showFractionDigit ? 1 : 0,
    style: "percent",
  }).format(value / 100);
}

function currencyFormat(currency: string): ChartStatFlowFormat {
  return {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  };
}
