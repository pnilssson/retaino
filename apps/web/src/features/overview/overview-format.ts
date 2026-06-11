import {
  formatDisplayMinorCurrency,
  formatDisplayNumber,
} from '@/lib/format-display';
import { getIntlLocale } from '@/lib/locale-format';

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

export function formatOverviewDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00.000Z`));
}
