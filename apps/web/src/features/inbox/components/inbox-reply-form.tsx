"use client";

import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ItemNotice } from '@/components/item-notice';
import { SmsMessageEstimate } from '@/components/sms-message-estimate';
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
  const t = useTranslations('Inbox');
  const common = useTranslations('Common');
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
      toast.success(t('replySent'));
    },
  });

  return (
    <form
      className="grid gap-3 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {disabled ? (
        <ItemNotice
          description={t('repliesBlockedDescription')}
          title={t('repliesBlockedTitle')}
          variant="warning"
        />
      ) : null}

      <form.Field name="body">
        {(field) => (
          <div className="relative">
            <Textarea
              aria-label={t('replyLabel')}
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
              placeholder={t('replyPlaceholder')}
              rows={2}
              value={field.state.value}
            />
            <SmsMessageEstimate
              body={field.state.value}
              className="absolute bottom-4 left-3 max-w-[calc(100%-7rem)] truncate"
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
                  {sendReply.isPending || isSubmitting ? t('sending') : t('send')}
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
              : common('tryAgainSoon')
          }
          title={t('replyErrorTitle')}
          variant="error"
        />
      ) : null}
    </form>
  );
}
