"use client";

import { parseAsString, useQueryStates } from 'nuqs';
import type { InboxConversationActivityFilter } from '@retaino/shared/contracts';

export function useInboxQueryState() {
  const [query, setQuery] = useQueryStates({
    conversation: parseAsString.withDefault(''),
    search: parseAsString.withDefault(''),
    view: parseAsString.withDefault('needs_reply'),
  });

  return [
    {
      conversation: query.conversation,
      search: query.search,
      view: inboxConversationView(query.view),
    },
    setQuery,
  ] as const;
}

function inboxConversationView(
  value: string,
): InboxConversationActivityFilter {
  return value === 'all' ? 'all' : 'needs_reply';
}
