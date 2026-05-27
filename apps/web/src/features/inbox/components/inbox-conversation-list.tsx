"use client";

import type {
  InboxConversationActivityFilter,
  InboxConversationSummary,
} from '@retaino/shared/contracts';
import {
  MessageCircle,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { textStyles } from '@/lib/text-styles';
import {
  formatInboxDateTime,
  inboxActivityLabel,
} from '../inbox-format';

const activityFilters: InboxConversationActivityFilter[] = [
  'inbound',
  'unread',
  'all',
];

export function InboxConversationList({
  activity,
  className,
  conversations,
  onActivityChange,
  onSelect,
  selectedConversationId,
}: {
  activity: InboxConversationActivityFilter;
  className?: string;
  conversations: InboxConversationSummary[];
  onActivityChange: (activity: InboxConversationActivityFilter) => void;
  onSelect: (conversationId: string) => void;
  selectedConversationId: string | null;
}) {
  return (
    <section
      className={cn(
        'grid min-h-[560px] overflow-hidden rounded-lg border border-border bg-card',
        className,
      )}
    >
      <div className="flex flex-wrap gap-2 border-b border-border p-3">
        {activityFilters.map((item) => (
          <Button
            aria-pressed={activity === item}
            key={item}
            onClick={() => onActivityChange(item)}
            size="sm"
            type="button"
            variant={activity === item ? 'default' : 'outline'}
          >
            {inboxActivityLabel(item)}
          </Button>
        ))}
      </div>
      <div className="min-h-0 overflow-auto">
        {conversations.length > 0 ? (
          <div className="divide-y divide-border">
            {conversations.map((conversation) => (
              <button
                className={cn(
                  'grid w-full gap-2 px-4 py-3 text-left transition hover:bg-muted/50',
                  selectedConversationId === conversation.id && 'bg-muted',
                )}
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                type="button"
              >
                <span className="flex min-w-0 items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <MessageCircle
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                    <span className={cn('truncate', textStyles.itemTitle)}>
                      {conversation.contactName ?? conversation.phone}
                    </span>
                  </span>
                  {conversation.unreadCount > 0 ? (
                    <Badge className="h-5 min-w-5 px-1.5">
                      {conversation.unreadCount}
                    </Badge>
                  ) : null}
                </span>
                <span className={cn('line-clamp-2', textStyles.body)}>
                  {conversation.latestMessageBody || 'No message text'}
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  {conversation.latestCampaignName ? (
                    <Badge variant="outline">
                      {conversation.latestCampaignName}
                    </Badge>
                  ) : null}
                  {conversation.replyBlocked ? (
                    <Badge variant="outline">
                      <ShieldAlert aria-hidden="true" data-icon="inline-start" />
                      Blocked
                    </Badge>
                  ) : null}
                  <span className={textStyles.meta}>
                    {formatInboxDateTime(conversation.latestMessageAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center px-4 py-8">
            <p className={textStyles.mutedBody}>
              No conversations match this filter.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
