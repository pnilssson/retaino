"use client";

import type {
  InboxConversationActivityFilter,
  InboxConversationSummary,
} from '@retaino/shared/contracts';
import { Search } from 'lucide-react';
import { BlockedStatusBadge } from '@/components/blocked-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import {
  formatInboxListTime,
  formatInboxDateTime,
  inboxActivityLabel,
} from '../inbox-format';

const activityFilters: InboxConversationActivityFilter[] = [
  'all',
  'needs_reply',
];

export function InboxConversationList({
  activity,
  className,
  conversations,
  onActivityChange,
  onSearchChange,
  onSelect,
  search = '',
  selectedConversationId,
}: {
  activity: InboxConversationActivityFilter;
  className?: string;
  conversations: InboxConversationSummary[];
  onActivityChange: (activity: InboxConversationActivityFilter) => void;
  onSearchChange: (search: string) => void;
  onSelect: (conversationId: string) => void;
  search: string;
  selectedConversationId: string | null;
}) {
  return (
    <section
      className={cn(
        'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-card',
        className,
      )}
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-3">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            aria-label="Search conversations"
            autoComplete="off"
            className="h-9 rounded-lg bg-background pl-9"
            name="inbox-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            type="search"
            value={search}
          />
        </div>
        <div
          aria-label="Inbox view"
          className="inline-flex shrink-0 rounded-lg border border-border bg-background p-0.5"
          role="group"
        >
          {activityFilters.map((item) => (
            <Button
              aria-pressed={activity === item}
              className="whitespace-nowrap rounded-[calc(var(--radius)-3px)] px-3"
              key={item}
              onClick={() => onActivityChange(item)}
              size="sm"
              type="button"
              variant={activity === item ? 'default' : 'ghost'}
            >
              {inboxActivityLabel(item)}
            </Button>
          ))}
        </div>
      </header>
      <div className="min-h-0 overflow-auto">
        {conversations.length > 0 ? (
          <ol className="m-0 flex list-none flex-col p-0">
            {conversations.map((conversation) => (
              <li className="m-0 border-b border-border p-0" key={conversation.id}>
                <button
                  className={cn(
                    'grid w-full gap-1.5 px-4 py-3 text-left transition-[background-color,color] hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                    selectedConversationId === conversation.id &&
                      'bg-sidebar-accent hover:bg-sidebar-accent focus-visible:bg-sidebar-accent',
                  )}
                  onClick={() => onSelect(conversation.id)}
                  type="button"
                >
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    <span
                      className={cn(
                        'truncate',
                        textStyles.itemTitle,
                      )}
                    >
                      {conversation.contactName ?? conversation.phone}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          textStyles.meta,
                          conversation.unreadCount > 0
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                        )}
                        title={formatInboxDateTime(
                          conversation.latestMessageAt,
                        )}
                      >
                        {formatInboxListTime(conversation.latestMessageAt)}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <Badge className="h-5 min-w-5 rounded-full px-1.5">
                          {conversation.unreadCount > 99
                            ? '99+'
                            : conversation.unreadCount}
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate',
                        conversation.unreadCount > 0
                          ? textStyles.body
                          : textStyles.mutedBody,
                      )}
                    >
                      {conversation.latestMessageDirection === 'outbound'
                        ? 'You: '
                        : ''}
                      {conversation.latestMessageBody || 'No message text'}
                    </span>
                  </span>
                  {conversation.latestCampaignName ||
                  conversation.replyBlocked ? (
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {conversation.latestCampaignName ? (
                        <Badge className="max-w-full truncate" variant="outline">
                          {conversation.latestCampaignName}
                        </Badge>
                      ) : null}
                      {conversation.replyBlocked ? (
                        <BlockedStatusBadge />
                      ) : null}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <p className={cn('max-w-64 text-center', textStyles.mutedBody)}>
              {search.trim()
                ? 'No conversations match your search.'
                : activity === 'needs_reply'
                  ? 'No conversations need a reply.'
                  : 'No conversations yet.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
