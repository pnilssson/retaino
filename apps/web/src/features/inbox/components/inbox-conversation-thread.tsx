"use client";

import type {
  InboxConversationSummary,
  InboxMessage,
} from '@retaino/shared/contracts';
import {
  Inbox,
  UserPlus,
} from 'lucide-react';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { BlockedStatusBadge } from '@/components/blocked-status-badge';
import { EmptyState } from '@/components/empty-state';
import { ItemNotice } from '@/components/item-notice';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { ContactCreateDialog } from '@/features/contacts/components/contact-create-dialog';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import {
  formatInboxDateSeparator,
  formatInboxMessageTime,
  inboxMessageDayKey,
} from '../inbox-format';
import { InboxReplyForm } from './inbox-reply-form';

export function InboxConversationThread({
  className,
  conversation,
  error,
  isLoading,
  messages,
  organizationId,
  phoneCountryCode,
}: {
  className?: string;
  conversation: InboxConversationSummary | null;
  error: Error | null;
  isLoading: boolean;
  messages: InboxMessage[];
  organizationId: string | null;
  phoneCountryCode: string;
}) {
  const locale = useLocale();
  const t = useTranslations('Inbox');
  const contactTranslations = useTranslations('Contacts');
  const [addContactOpen, setAddContactOpen] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const campaignMessageId = messages.find(
    (message) => message.direction === 'outbound' && message.campaignName,
  )?.id;
  const latestMessageId = messages.at(-1)?.id ?? null;

  useEffect(() => {
    if (!conversation?.id || isLoading) {
      return undefined;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const messageList = messageListRef.current;

      if (messageList) {
        messageList.scrollTop = messageList.scrollHeight;
      }
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [conversation?.id, isLoading, latestMessageId]);

  if (!conversation) {
    return (
      <section
        className={cn(
          'grid min-h-0 bg-card',
          className,
        )}
      >
        <EmptyState
          description={t('noConversationDescription')}
          icon={Inbox}
          title={t('noConversationTitle')}
          variant="page"
        />
      </section>
    );
  }

  return (
    <section
      className={cn(
        'grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-card',
        className,
      )}
    >
      <header className="border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className={cn('min-w-0 flex-1 truncate', textStyles.itemTitle)}>
            {conversation.contactName ?? conversation.phone}
          </h2>
          {conversation.contactName ? (
            <span className={cn('shrink-0 truncate', textStyles.meta)}>
              {conversation.phone}
            </span>
          ) : null}
          {conversation.replyBlocked ? (
            <BlockedStatusBadge label={t('repliesBlockedTitle')} />
          ) : null}
          {!conversation.contactId ? (
            <Button
              onClick={() => setAddContactOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <UserPlus aria-hidden="true" data-icon="inline-start" />
              {contactTranslations('addContact')}
            </Button>
          ) : null}
        </div>
        {!conversation.contactId ? (
          <ContactCreateDialog
            defaultPhone={conversation.phone}
            onOpenChange={setAddContactOpen}
            open={addContactOpen}
            organizationId={organizationId}
            phoneCountryCode={phoneCountryCode}
          />
        ) : null}
      </header>

      <div
        className="min-h-0 overflow-auto bg-card px-4 py-4"
        ref={messageListRef}
      >
        {error ? (
          <ItemNotice
            description={error.message}
            title={t('conversationLoadErrorTitle')}
            variant="error"
          />
        ) : isLoading ? (
          <LoadingState className="min-h-[320px]" label={t('loadingConversation')} />
        ) : messages.length > 0 ? (
          <ol className="grid gap-3">
            {messages.map((message, index) => {
              const time = inboxMessageTime(message);
              const dayKey = inboxMessageDayKey(time);
              const previous = messages[index - 1];
              const previousDayKey = previous
                ? inboxMessageDayKey(inboxMessageTime(previous))
                : null;

              return (
                <li className="contents" key={message.id}>
                  {dayKey !== previousDayKey ? (
                    <div className="flex justify-center py-1">
                      <span
                        className={cn(
                          'rounded-full border border-border bg-card px-2.5 py-1 shadow-xs',
                          textStyles.meta,
                        )}
                      >
                        {formatInboxDateSeparator(time, locale)}
                      </span>
                    </div>
                  ) : null}
                  <InboxMessageBubble
                    locale={locale}
                    message={message}
                    noMessageText={t('noMessageText')}
                    showCampaignBadge={message.id === campaignMessageId}
                  />
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            description={t('noMessagesDescription')}
            icon={Inbox}
            title={t('noMessagesTitle')}
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

function InboxMessageBubble({
  locale,
  message,
  noMessageText,
  showCampaignBadge,
}: {
  locale: string;
  message: InboxMessage;
  noMessageText: string;
  showCampaignBadge: boolean;
}) {
  const isOutbound = message.direction === 'outbound';
  const time = inboxMessageTime(message);

  return (
    <div
      className={cn(
        'flex min-w-0',
        isOutbound ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'grid min-w-0 max-w-[84%] gap-2 overflow-hidden rounded-lg px-3 py-2 shadow-xs sm:max-w-[68%]',
          isOutbound
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        <p
          className={cn(
            'min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]',
            textStyles.body,
            isOutbound ? 'text-primary-foreground' : 'text-foreground',
          )}
        >
          {message.body || noMessageText}
        </p>
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-2',
            isOutbound
              ? 'text-primary-foreground/75'
              : 'text-muted-foreground',
          )}
        >
          {showCampaignBadge && message.campaignName ? (
            <span
              className={cn(
                'rounded-md border px-1.5 py-0.5',
                textStyles.meta,
                isOutbound
                  ? 'border-primary-foreground/30 text-primary-foreground/75'
                  : 'border-border',
              )}
            >
              {message.campaignName}
            </span>
          ) : null}
          <span
            className={cn(
              textStyles.meta,
              isOutbound ? 'text-primary-foreground/75' : '',
            )}
          >
            {formatInboxMessageTime(time, locale)}
          </span>
          {isOutbound ? (
            <span
              className={cn(
                textStyles.meta,
                'capitalize text-primary-foreground/75',
              )}
            >
              {message.status}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function inboxMessageTime(message: InboxMessage) {
  return message.receivedAt ?? message.sentAt ?? message.createdAt;
}
