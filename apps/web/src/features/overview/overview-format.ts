import {
  formatDisplayMinorCurrency,
  formatDisplayNumber,
} from '@/lib/format-display';

export function formatOverviewNumber(value: number, locale: string) {
  return formatDisplayNumber(value, locale);
}

export function formatOverviewCurrency(
  value: number | null,
  currency: string,
  locale: string,
) {
  return formatDisplayMinorCurrency(value, currency, locale);
}
