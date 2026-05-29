import {
  formatDisplayMinorCurrency,
  formatDisplayNumber,
} from '@/lib/format-display';

export function formatReportNumber(value: number) {
  return formatDisplayNumber(value);
}

export function formatReportPercent(value: number, total: number) {
  if (total <= 0) {
    return '0%';
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    style: 'percent',
  }).format(value / total);
}

export function formatReportCurrency(value: number, currency: string) {
  return formatDisplayMinorCurrency(value, currency);
}

export function formatReportDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

export function formatReportDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
