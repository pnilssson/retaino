"use client";

import type { ReactNode } from 'react';
import { useForm } from '@tanstack/react-form';
import type { Campaign } from '@retaino/shared/contracts';
import { createCampaignSmsPreview } from '@retaino/shared';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import {
  campaignSendStatusText,
  isPreviewableAudienceRule,
  type CampaignFormValues,
} from '../campaign-form-state';
import { useCampaignAudiencePreview } from '../hooks/use-campaign-audience-preview';
import { useCampaignRecipientSummary } from '../hooks/use-campaign-recipient-summary';
import { useSendCampaignTestSms } from '../hooks/use-send-campaign-test-sms';
import { MessageEstimate, MessagePreview } from './message-preview';

export function CampaignReview({
  campaign,
  campaignId,
  organizationId,
  senderReady,
  values,
}: {
  campaign: Campaign | null;
  campaignId: string | null;
  organizationId: string | null;
  senderReady: boolean;
  values: CampaignFormValues;
}) {
  const audiencePreview = useCampaignAudiencePreview({
    audienceRule: values.audienceRule,
    enabled:
      (!campaign || campaign.status === 'draft') &&
      isPreviewableAudienceRule(values.audienceRule),
    organizationId,
  });
  const recipientSummary = useCampaignRecipientSummary({
    campaignId,
    enabled: Boolean(campaign && campaign.status !== 'draft'),
    organizationId,
  });
  const smsPreview = createCampaignSmsPreview({ smsBody: values.smsBody });
  const frozenRecipientCount = recipientSummary.data?.recipientCount ?? null;
  const eligibleCount = audiencePreview.data?.eligibleCount ?? null;
  const usageRecipientCount =
    campaign && campaign.status !== 'draft' ? frozenRecipientCount : eligibleCount;
  const estimatedCredits =
    usageRecipientCount === null
      ? null
      : usageRecipientCount * smsPreview.estimatedSmsPerRecipient;
  const campaignReference = values.campaignCode.trim();
  const shouldShowReference =
    campaignReference &&
    campaignReference.toLowerCase() !== values.name.trim().toLowerCase();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <div className="grid content-start gap-6">
        <ReviewSection title="Campaign">
          <p className={textStyles.body}>{values.name || 'Not named'}</p>
        </ReviewSection>

        {shouldShowReference ? (
          <ReviewSection title="Reference">
            <p className={textStyles.body}>{campaignReference}</p>
          </ReviewSection>
        ) : null}

        <ReviewSection title="Audience">
          <p className={textStyles.body}>
            {campaign && campaign.status !== 'draft'
              ? frozenRecipientCount === null
                ? recipientSummary.isLoading
                  ? 'Loading selected recipients...'
                  : 'Selected recipients unavailable.'
                : `${frozenRecipientCount} selected ${frozenRecipientCount === 1 ? 'recipient' : 'recipients'}.`
              : audiencePreview.isLoading
                ? 'Checking eligible contacts...'
                : eligibleCount === null
                  ? 'Eligible contacts unavailable.'
                  : `${eligibleCount} eligible ${eligibleCount === 1 ? 'contact' : 'contacts'}. Last booking at least ${values.audienceRule.lapsedDays} days ago. Contacts without booking date ${
                      values.audienceRule.includeNoBookingDate
                        ? 'included'
                        : 'excluded'
                    }.${
                      audiencePreview.data
                        ? ` ${audiencePreview.data.suppressedCount} suppressed, ${audiencePreview.data.incompleteCount} missing phone, ${audiencePreview.data.missingConsentCount} missing consent.`
                        : ''
                    }`}
          </p>
        </ReviewSection>

        {campaign && campaign.status !== 'draft' ? (
          <ReviewSection title="Send status">
            <p className={textStyles.body}>
              {campaignSendStatusText(campaign)}
            </p>
          </ReviewSection>
        ) : null}

        <ReviewSection title="Booking">
          {values.bookingUrl ? (
            <a
              className={cn(
                'break-words underline underline-offset-4',
                textStyles.body,
              )}
              href={values.bookingUrl}
              rel="noreferrer"
              target="_blank"
            >
              {values.bookingUrl}
            </a>
          ) : (
            <p className={textStyles.body}>Not added</p>
          )}
        </ReviewSection>

        <ReviewSection title="Sender">
          <p className={textStyles.body}>
            {senderReady ? 'Ready for test SMS.' : 'Set up the sender first.'}
          </p>
        </ReviewSection>
      </div>

      <div className="grid content-start gap-6">
        <ReviewSection title="Recipient preview">
          <MessagePreview showLabel={false} smsBody={values.smsBody} />
          <MessageEstimate smsBody={values.smsBody} />
        </ReviewSection>

        <ReviewSection title="Estimated usage">
          <p className={textStyles.body}>
            {estimatedCredits === null
              ? 'Usage estimate unavailable.'
              : `Up to ${estimatedCredits} SMS ${estimatedCredits === 1 ? 'credit' : 'credits'}`}
          </p>
        </ReviewSection>

        <ReviewSection title="Test SMS">
          <CampaignTestSend
            campaignId={campaignId}
            senderReady={senderReady}
          />
        </ReviewSection>
      </div>
    </div>
  );
}

function CampaignTestSend({
  campaignId,
  senderReady,
}: {
  campaignId: string | null;
  senderReady: boolean;
}) {
  const testSend = useSendCampaignTestSms(campaignId);
  const form = useForm({
    defaultValues: {
      testPhone: '',
    },
    onSubmit: async ({ value }) => {
      const response = await testSend.mutateAsync({
        testPhone: value.testPhone.trim() || undefined,
      });

      toast.success('Test SMS sent.', {
        description: `${response.testSend.chargedCredits} SMS ${
          response.testSend.chargedCredits === 1 ? 'credit' : 'credits'
        } used.`,
      });
    },
  });

  return (
    <div className="grid gap-3">
      <form.Field name="testPhone">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Test phone</Label>
            <Input
              autoComplete="off"
              disabled={!senderReady || testSend.isPending}
              id={field.name}
              inputMode="tel"
              name={field.name}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              placeholder="Use responsible phone..."
              type="tel"
              value={field.state.value}
            />
          </div>
        )}
      </form.Field>

      {testSend.isError ? (
        <p aria-live="polite" className={textStyles.error}>
          {testSend.error instanceof Error
            ? testSend.error.message
            : 'Test SMS could not be sent.'}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          disabled={
            !campaignId ||
            !senderReady ||
            testSend.isPending
          }
          onClick={() => void form.handleSubmit()}
          type="button"
        >
          <Send aria-hidden="true" data-icon="inline-start" />
          {testSend.isPending ? 'Sending test SMS...' : 'Send test SMS'}
        </Button>
      </div>
    </div>
  );
}

function ReviewSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-2">
      <h3 className={textStyles.itemTitle}>{title}</h3>
      {children}
    </section>
  );
}
