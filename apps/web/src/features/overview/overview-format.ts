import {
  formatDisplayMinorCurrency,
  formatDisplayNumber,
} from '@/lib/format-display';

export function formatOverviewNumber(value: number) {
  return formatDisplayNumber(value);
}

export function formatOverviewCurrency(
  value: number | null,
  currency: string,
) {
  return formatDisplayMinorCurrency(value, currency);
}

export function formatOverviewDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00.000Z`));
}
