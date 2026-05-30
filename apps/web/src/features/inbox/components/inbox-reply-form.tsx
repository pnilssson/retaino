"use client";

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSendInboxReply } from '../hooks/use-send-inbox-reply';

export function InboxReplyForm({
  conversationId,
  disabled,
  organizationId,
}: {
  conversationId: string | null;
  disabled: boolean;
  organizationId: string | null;
}) {
  const sendReply = useSendInboxReply({ conversationId, organizationId });
  const [draftAttempt, setDraftAttempt] = useState<{
    body: string;
    clientRequestId: string;
    conversationId: string | null;
  } | null>(null);
  const form = useForm({
    defaultValues: {
      body: '',
    },
    onSubmit: async ({ value, formApi }) => {
      const body = value.body;
      const attempt =
        draftAttempt?.body === body &&
        draftAttempt.conversationId === conversationId
          ? draftAttempt
          : {
              body,
              clientRequestId: crypto.randomUUID(),
              conversationId,
            };

      setDraftAttempt(attempt);
      await sendReply.mutateAsync({
        body,
        clientRequestId: attempt.clientRequestId,
      });
      setDraftAttempt(null);
      formApi.reset();
      toast.success('Reply sent.');
    },
  });

  return (
    <form
      className="grid gap-3 border-t border-border bg-card p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {disabled ? (
        <ItemNotice
          description="This phone number cannot receive replies."
          title="Replies blocked"
          variant="warning"
        />
      ) : null}

      <form.Field name="body">
        {(field) => (
          <div className="relative">
            <Textarea
              aria-label="Reply"
              className="min-h-24 resize-none rounded-lg bg-background pb-14 pr-24"
              disabled={disabled || sendReply.isPending}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => {
                const nextBody = event.target.value;
                field.handleChange(nextBody);

                if (draftAttempt && draftAttempt.body !== nextBody) {
                  setDraftAttempt(null);
                }
              }}
              placeholder="Write a reply..."
              rows={2}
              value={field.state.value}
            />
            <form.Subscribe
              selector={(state) => ({
                body: state.values.body,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ body, isSubmitting }) => (
                <Button
                  className="absolute bottom-3 right-3"
                  disabled={
                    disabled ||
                    sendReply.isPending ||
                    isSubmitting ||
                    body.trim().length === 0
                  }
                  type="submit"
                >
                  <Send aria-hidden="true" data-icon="inline-start" />
                  {sendReply.isPending || isSubmitting ? 'Sending...' : 'Send'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        )}
      </form.Field>

      {sendReply.isError ? (
        <ItemNotice
          description={
            sendReply.error instanceof Error
              ? sendReply.error.message
              : 'Try again.'
          }
          title="Reply could not be sent"
          variant="error"
        />
      ) : null}
    </form>
  );
}
