import { getIntlLocale } from '@/lib/locale-format';

export function formatBillingDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatCreditCount(value: number, locale: string) {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

export function formatSek(value: number, locale: string) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    currency: 'SEK',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

export function formatUnitSek(value: number, locale: string) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    currency: 'SEK',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}
