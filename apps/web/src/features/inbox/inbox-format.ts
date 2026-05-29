import type { InboxConversationActivityFilter } from '@retaino/shared/contracts';

export function formatInboxDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatInboxListTime(value: string) {
  const date = new Date(value);
  const now = new Date();

  if (isSameCalendarDay(date, now)) {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatInboxMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatInboxDateSeparator(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function inboxActivityLabel(activity: InboxConversationActivityFilter) {
  if (activity === 'all') {
    return 'All';
  }

  return 'Needs reply';
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
