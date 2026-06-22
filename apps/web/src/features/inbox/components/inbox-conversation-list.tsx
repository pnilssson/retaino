"use client";

import {
  INBOX_CONVERSATION_ACTIVITY_FILTERS,
  type InboxConversationActivityFilter,
  type InboxConversationSummary,
} from '@retaino/shared/contracts';
import {
  Mail,
  MailOpen,
  Search,
} from 'lucide-react';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
import { BlockedStatusBadge } from '@/components/blocked-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import {
  formatInboxDateTime,
  formatInboxListTime,
} from '../inbox-format';

export function InboxConversationList({
  activity,
  className,
  conversations,
  onActivityChange,
  onSearchChange,
  onSelect,
  onToggleReadState,
  pendingReadStateConversationId,
  search = '',
  selectedConversationId,
}: {
  activity: InboxConversationActivityFilter;
  className?: string;
  conversations: InboxConversationSummary[];
  onActivityChange: (activity: InboxConversationActivityFilter) => void;
  onSearchChange: (search: string) => void;
  onSelect: (conversationId: string) => void;
  onToggleReadState: (conversationId: string, read: boolean) => void;
  pendingReadStateConversationId: string | null;
  search: string;
  selectedConversationId: string | null;
}) {
  const locale = useLocale();
  const t = useTranslations('Inbox');

  return (
    <section
      className={cn(
        'grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden',
        className,
      )}
    >
      <header className="flex items-center gap-2 px-3 py-3">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            aria-label={t('searchConversations')}
            autoComplete="off"
            className="h-9 rounded-lg bg-background pl-9"
            name="inbox-search"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t('searchPlaceholder')}
            type="search"
            value={search}
          />
        </div>
        <div
          aria-label={t('viewLabel')}
          className="inline-flex shrink-0 rounded-lg border border-border bg-background p-0.5"
          role="group"
        >
          {INBOX_CONVERSATION_ACTIVITY_FILTERS.map((item) => (
            <Button
              aria-pressed={activity === item}
              className="whitespace-nowrap rounded-[calc(var(--radius)-3px)] px-3"
              key={item}
              onClick={() => onActivityChange(item)}
              size="sm"
              type="button"
              variant={activity === item ? 'default' : 'ghost'}
            >
              {item === 'all' ? t('all') : t('needsReply')}
            </Button>
          ))}
        </div>
      </header>
      <div className="min-h-0 overflow-auto">
        {conversations.length > 0 ? (
          <ol className="m-0 flex list-none flex-col p-0">
            {conversations.map((conversation) => {
              const readStateLabel = conversation.isUnread
                ? t('markAsRead')
                : t('markAsUnread');
              const ReadStateIcon = conversation.isUnread ? MailOpen : Mail;

              return (
                <li className="m-0 p-0" key={conversation.id}>
                  <div
                    className={cn(
                      'grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] transition-[background-color,color] hover:bg-muted/50 focus-within:bg-muted',
                      selectedConversationId === conversation.id &&
                        'bg-sidebar-accent hover:bg-sidebar-accent focus-within:bg-sidebar-accent',
                    )}
                  >
                    <button
                      className="col-start-1 row-span-2 grid min-w-0 gap-1.5 px-4 py-3 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      onClick={() => onSelect(conversation.id)}
                      type="button"
                    >
                      <span
                        className={cn(
                          'block truncate',
                          textStyles.h3,
                          conversation.isUnread && 'text-foreground',
                        )}
                      >
                        {conversation.contactName ?? conversation.phone}
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate',
                            conversation.isUnread
                              ? textStyles.p
                              : textStyles.mutedP,
                          )}
                        >
                          {conversation.latestMessageDirection === 'outbound'
                            ? t('youPrefix')
                            : ''}
                          {conversation.latestMessageBody || t('noMessageText')}
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
                    <span className="col-start-2 row-start-1 flex shrink-0 items-center pr-4 pt-3">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            aria-label={readStateLabel}
                            className={cn(
                              '-my-1.5 -mr-1.5 size-8 rounded-full text-muted-foreground hover:text-foreground',
                              conversation.isUnread && 'text-foreground',
                            )}
                            disabled={
                              pendingReadStateConversationId === conversation.id
                            }
                            onClick={() => {
                              onToggleReadState(
                                conversation.id,
                                conversation.isUnread,
                              );
                            }}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <ReadStateIcon aria-hidden="true" className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{readStateLabel}</TooltipContent>
                      </Tooltip>
                      <span
                        className={cn(
                          'ml-2',
                          textStyles.small,
                          conversation.isUnread
                            ? 'text-foreground'
                            : 'text-muted-foreground',
                        )}
                        title={formatInboxDateTime(
                          conversation.latestMessageAt,
                          locale,
                        )}
                      >
                        {formatInboxListTime(
                          conversation.latestMessageAt,
                          locale,
                        )}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="flex min-h-full items-center justify-center px-4 py-8">
            <p className={cn('max-w-64 text-center', textStyles.mutedP)}>
              {search.trim()
                ? t('noSearchResults')
                : activity === 'needs_reply'
                  ? t('noNeedsReply')
                  : t('noConversations')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
