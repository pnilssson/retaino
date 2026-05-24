import type { InboxConversationActivityFilter } from '@retaino/shared/contracts';

export function formatInboxDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function inboxActivityLabel(activity: InboxConversationActivityFilter) {
  if (activity === 'unread') {
    return 'Unread';
  }

  if (activity === 'all') {
    return 'All conversations';
  }

  return 'Needs reply';
}
