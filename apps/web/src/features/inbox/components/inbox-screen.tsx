"use client";

import type { InboxConversationActivityFilter } from '@retaino/shared/contracts';
import { useEffect, useMemo, useState } from 'react';
import { ItemNotice } from '@/components/item-notice';
import {
  AppPageContent,
  AppPageItem,
  AppPageLoading,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { cn } from '@/lib/utils';
import { useInboxConversation } from '../hooks/use-inbox-conversation';
import { useInboxConversations } from '../hooks/use-inbox-conversations';
import { useMarkInboxConversationRead } from '../hooks/use-mark-inbox-conversation-read';
import { InboxConversationList } from './inbox-conversation-list';
import { InboxConversationThread } from './inbox-conversation-thread';

export function InboxScreen() {
  const session = useOrganizationSession();
  const organizationId = session.data?.organization.id ?? null;
  const [activity, setActivity] =
    useState<InboxConversationActivityFilter>('inbound');
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const conversations = useInboxConversations({
    activity,
    enabled: Boolean(session.data?.readiness.ready),
    organizationId,
  });
  const selectedConversation = useMemo(
    () =>
      conversations.data?.conversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ) ?? null,
    [conversations.data?.conversations, selectedConversationId],
  );
  const conversation = useInboxConversation({
    conversationId: selectedConversationId,
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
    if (
      threadConversation?.unreadCount &&
      threadConversation.unreadCount > 0 &&
      !markRead.isPending
    ) {
      markRead.mutate();
    }
  }, [markRead, threadConversation?.id, threadConversation?.unreadCount]);

  if (session.isLoading) {
    return <AppPageLoading className="max-w-7xl" label="Loading inbox" />;
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
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-7xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          description="Review SMS replies and continue client conversations from one shared inbox."
          title="Inbox"
        />

        <AppPageContent>
          {!session.data.readiness.ready ? (
            <AppPageItem asChild>
              <section>
                <ItemNotice
                  description="Finish organization setup before sending campaigns and managing SMS replies."
                  title="Setup required before inbox activity"
                  variant="warning"
                />
              </section>
            </AppPageItem>
          ) : conversations.isError ? (
            <AppPageItem asChild>
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
            </AppPageItem>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
              <InboxConversationList
                activity={activity}
                className={cn(selectedConversationId && 'hidden lg:grid')}
                conversations={conversations.data?.conversations ?? []}
                onActivityChange={(nextActivity) => {
                  setActivity(nextActivity);
                  setSelectedConversationId(null);
                }}
                onSelect={setSelectedConversationId}
                selectedConversationId={selectedConversationId}
              />
              <InboxConversationThread
                className={cn(!selectedConversationId && 'hidden lg:grid')}
                conversation={threadConversation}
                error={
                  conversation.error instanceof Error
                    ? conversation.error
                    : null
                }
                isFetching={conversation.isFetching}
                isLoading={conversation.isLoading}
                messages={conversation.data?.messages ?? []}
                onBack={() => setSelectedConversationId(null)}
                onCheckForNewReplies={() => {
                  void conversation.refetch();
                }}
                organizationId={organizationId}
              />
            </div>
          )}
        </AppPageContent>
      </section>
    </main>
  );
}
