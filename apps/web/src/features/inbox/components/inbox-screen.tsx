"use client";

import type { InboxConversationSummary } from '@retaino/shared/contracts';
import {
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { InfoTooltip } from '@/components/info-tooltip';
import { ItemNotice } from '@/components/item-notice';
import { Item } from '@/components/ui/item';
import { AppPageLoading } from '@/features/appshell/components/app-page-loading';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { ContentSection } from '@/features/appshell/components/content-section';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { cn } from '@/lib/utils';
import { useInboxConversation } from '../hooks/use-inbox-conversation';
import { useInboxConversations } from '../hooks/use-inbox-conversations';
import { useInboxQueryState } from '../hooks/use-inbox-query-state';
import { useMarkInboxConversationRead } from '../hooks/use-mark-inbox-conversation-read';
import { InboxConversationList } from './inbox-conversation-list';
import { InboxConversationThread } from './inbox-conversation-thread';

export function InboxScreen() {
  const session = useOrganizationSession();
  const [{ conversation: selectedConversationId, search, view }, setQuery] =
    useInboxQueryState();
  const readAttemptConversationIdRef = useRef<string | null>(null);
  const organizationId = session.data?.organization.id ?? null;
  const conversations = useInboxConversations({
    activity: view,
    enabled: Boolean(session.data?.readiness.ready),
    organizationId,
  });
  const filteredConversations = useMemo(
    () =>
      filterInboxConversations(
        conversations.data?.conversations ?? [],
        search ?? '',
      ),
    [conversations.data?.conversations, search],
  );
  const selectedConversation = useMemo(
    () =>
      conversations.data?.conversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ) ?? null,
    [conversations.data?.conversations, selectedConversationId],
  );
  const conversation = useInboxConversation({
    conversationId: selectedConversationId || null,
    enabled: Boolean(session.data?.readiness.ready && selectedConversationId),
    organizationId,
  });
  const threadConversation =
    conversation.data?.conversation ?? selectedConversation;
  const markRead = useMarkInboxConversationRead({
    conversationId: threadConversation?.id ?? null,
    organizationId,
  });

  useEffect(() => {
    if (!threadConversation?.id || !threadConversation.unreadCount) {
      readAttemptConversationIdRef.current = null;

      return;
    }

    if (
      threadConversation.unreadCount > 0 &&
      !markRead.isPending &&
      readAttemptConversationIdRef.current !== threadConversation.id
    ) {
      readAttemptConversationIdRef.current = threadConversation.id;
      markRead.mutate();
    }
  }, [
    markRead,
    threadConversation?.id,
    threadConversation?.unreadCount,
  ]);

  if (session.isLoading) {
    return <AppPageLoading className="max-w-7xl" label="Loading inbox…" />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title="Inbox could not be loaded"
            variant="error"
          />
        </div>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  return (
    <main className="flex min-h-0 flex-1 overflow-hidden bg-background">
      <section className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 grid-rows-[auto_minmax(0,1fr)] gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          description={(
            <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="min-w-0">
                Review SMS replies and continue client conversations from one shared inbox.
              </span>
              <InfoTooltip label="Reply credit details">
                Replies use SMS credits and are sent from your Retaino sender.
              </InfoTooltip>
            </span>
          )}
          title="Inbox"
        />

        {!session.data.readiness.ready ? (
          <ContentSection asChild className="w-full">
            <section>
              <ItemNotice
                description="Finish organization setup before sending campaigns and managing SMS replies."
                title="Setup required before inbox activity"
                variant="warning"
              />
            </section>
          </ContentSection>
        ) : conversations.isError ? (
          <ContentSection asChild className="w-full">
            <section>
              <ItemNotice
                description={
                  conversations.error instanceof Error
                    ? conversations.error.message
                    : 'Try again in a moment.'
                }
                title="Conversations could not be fetched"
                variant="error"
              />
            </section>
          </ContentSection>
        ) : (
          <div className="grid min-h-0 w-full flex-1 gap-3 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
            <Item
              asChild
              className={cn(
                'grid min-h-0 items-stretch overflow-hidden border-border bg-card p-0',
                selectedConversationId && 'hidden lg:grid',
              )}
              variant="outline"
            >
              <InboxConversationList
                activity={view}
                conversations={filteredConversations}
                onActivityChange={(nextActivity) => {
                  void setQuery({
                    conversation: '',
                    view: nextActivity,
                  });
                }}
                onSearchChange={(nextSearch) => {
                  void setQuery({ search: nextSearch });
                }}
                onSelect={(conversationId) => {
                  void setQuery({ conversation: conversationId });
                }}
                search={search ?? ''}
                selectedConversationId={selectedConversationId || null}
              />
            </Item>
            <Item
              asChild
              className={cn(
                'grid min-h-0 items-stretch overflow-hidden border-border bg-card p-0',
                !selectedConversationId && 'hidden lg:grid',
              )}
              variant="outline"
            >
              <InboxConversationThread
                conversation={threadConversation}
                error={
                  conversation.error instanceof Error
                    ? conversation.error
                    : null
                }
                isFetching={conversation.isFetching}
                isLoading={conversation.isLoading}
                messages={conversation.data?.messages ?? []}
                onBack={() => {
                  void setQuery({ conversation: '' });
                }}
                onCheckForNewReplies={() => {
                  void conversation.refetch();
                }}
                organizationId={organizationId}
              />
            </Item>
          </div>
        )}
      </section>
    </main>
  );
}

function filterInboxConversations(
  conversations: InboxConversationSummary[],
  search: string,
) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return conversations;
  }

  return conversations.filter((conversation) =>
    [
      conversation.contactName,
      conversation.phone,
      conversation.latestCampaignName,
      conversation.latestMessageBody,
    ]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedSearch)),
  );
}
