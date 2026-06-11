import {
  formatDisplayMinorCurrency,
  formatDisplayNumber,
} from '@/lib/format-display';
import { getIntlLocale } from '@/lib/locale-format';

export function formatReportNumber(value: number, locale: string) {
  return formatDisplayNumber(value, locale);
}

export function formatReportPercent(value: number, total: number, locale: string) {
  if (total <= 0) {
    return '0%';
  }

  return new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(value / total);
}

export function formatReportCurrency(value: number, currency: string, locale: string) {
  return formatDisplayMinorCurrency(value, currency, locale);
}

export function formatReportDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function formatReportDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
