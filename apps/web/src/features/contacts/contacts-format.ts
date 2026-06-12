import { getIntlLocale } from '@/lib/locale-format';

export function formatDate(value: string | null, locale: string, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function formatDateTime(
  value: string | null,
  locale: string,
  emptyLabel: string,
) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
