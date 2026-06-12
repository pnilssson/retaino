import { getIntlLocale } from '@/lib/locale-format';

export function formatInboxDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatInboxListTime(value: string, locale: string) {
  const date = new Date(value);
  const now = new Date();

  if (isSameCalendarDay(date, now)) {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatInboxMessageTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatInboxDateSeparator(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function inboxMessageDayKey(value: string) {
  const date = new Date(value);

  return [
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ].join('-');
}

function isSameCalendarDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
