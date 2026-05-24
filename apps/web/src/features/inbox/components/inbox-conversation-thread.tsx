"use client";

import type {
  InboxConversationSummary,
  InboxMessage,
} from '@retaino/shared/contracts';
import { ArrowLeft, Inbox, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { formatInboxDateTime } from '../inbox-format';
import { InboxReplyForm } from './inbox-reply-form';

export function InboxConversationThread({
  className,
  conversation,
  error,
  isFetching,
  isLoading,
  messages,
  onBack,
  onCheckForNewReplies,
  organizationId,
}: {
  className?: string;
  conversation: InboxConversationSummary | null;
  error: Error | null;
  isFetching: boolean;
  isLoading: boolean;
  messages: InboxMessage[];
  onBack: () => void;
  onCheckForNewReplies: () => void;
  organizationId: string | null;
}) {
  if (!conversation) {
    return (
      <section
        className={cn(
          'grid min-h-[560px] rounded-lg border border-border bg-card',
          className,
        )}
      >
        <EmptyState
          description="Choose a conversation to read replies and continue the thread."
          icon={Inbox}
          title="No conversation selected"
          variant="page"
        />
      </section>
    );
  }

  return (
    <section
      className={cn(
        'grid min-h-[560px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-border bg-card',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            aria-label="Back to conversations"
            className="mt-0.5 lg:hidden"
            onClick={onBack}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <div className="grid min-w-0 gap-1">
            <h2 className={cn('truncate', textStyles.itemTitle)}>
              {conversation.contactName ?? conversation.phone}
            </h2>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={cn('break-all', textStyles.meta)}>
                {conversation.phone}
              </span>
              {conversation.replyBlocked ? (
                <Badge variant="outline">
                  <ShieldAlert aria-hidden="true" data-icon="inline-start" />
                  Replies blocked
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          aria-label="Check for new replies"
          disabled={isFetching}
          onClick={onCheckForNewReplies}
          size="icon"
          type="button"
          variant="outline"
        >
          {isFetching ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
        </Button>
      </header>

      <div className="min-h-0 overflow-auto px-4 py-4">
        {error ? (
          <ItemNotice
            description={error.message}
            title="Conversation could not be loaded"
            variant="error"
          />
        ) : isLoading ? (
          <LoadingState className="min-h-[320px] justify-center" label="Loading conversation" />
        ) : messages.length > 0 ? (
          <ol className="grid gap-3">
            {messages.map((message) => (
              <InboxMessageBubble key={message.id} message={message} />
            ))}
          </ol>
        ) : (
          <EmptyState
            description="Messages will appear here as soon as Retaino sends or receives SMS for this phone."
            icon={Inbox}
            title="No messages yet"
          />
        )}
      </div>

      <InboxReplyForm
        conversationId={conversation.id}
        disabled={conversation.replyBlocked}
        organizationId={organizationId}
      />
    </section>
  );
}

function InboxMessageBubble({ message }: { message: InboxMessage }) {
  const isOutbound = message.direction === 'outbound';
  const time = message.receivedAt ?? message.sentAt ?? message.createdAt;

  return (
    <li className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'grid max-w-[82%] gap-2 rounded-lg px-3 py-2 sm:max-w-[70%]',
          isOutbound
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {message.body || 'No message text'}
        </p>
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-2',
            isOutbound
              ? 'text-primary-foreground/75'
              : 'text-muted-foreground',
          )}
        >
          {message.campaignName ? (
            <span
              className={cn(
                'rounded-md border px-1.5 py-0.5 text-xs leading-4',
                isOutbound
                  ? 'border-primary-foreground/30'
                  : 'border-border',
              )}
            >
              {message.campaignName}
            </span>
          ) : null}
          <span className="text-xs leading-5">
            {formatInboxDateTime(time)}
          </span>
          {isOutbound ? (
            <span className="text-xs leading-5 capitalize">
              {message.status}
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
