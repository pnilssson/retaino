"use client";

import {
  type ReactNode,
  useRef,
  useState,
} from 'react';
import { useForm } from '@tanstack/react-form';
import { requiresRecentCampaignExclusionAcknowledgement } from '@retaino/shared/contracts';
import type {
  Campaign,
  CampaignSendResponse,
  CreateCampaignDraftInput,
  UpdateCampaignDraftInput,
} from '@retaino/shared/contracts';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  GuidedFlowActions,
  GuidedFlowFrame,
  GuidedFlowSection,
  type GuidedFlowStep,
} from '@/components/guided-flow';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { useCreateCampaign } from '@/features/campaigns/hooks/use-create-campaign';
import { useUpdateCampaign } from '@/features/campaigns/hooks/use-update-campaign';
import {
  AppPageItem,
  AppPageSection,
} from '@/features/appshell/components/app-page-content';
import { getFieldError } from '@/lib/form-errors';
import { textStyles } from '@/lib/text-styles';
import { AudiencePreview } from './audience-preview';
import {
  AudienceExclusionFields,
  AudienceRuleFields,
} from './audience-rule-fields';
import {
  CampaignTextAreaInput,
  CampaignTextInput,
} from './campaign-field-controls';
import { CampaignReview } from './campaign-review';
import { CampaignTestSms } from './campaign-test-sms';
import { MessageEstimate, MessagePreview } from './message-preview';
import { SenderSetup } from './sender-setup';
import {
  campaignFormValuesToAudienceInput,
  campaignFormValuesToBookingInput,
  campaignFormValuesToCompleteInput,
  campaignFormValuesToInitialDraftInput,
  campaignFormValuesToMessageInput,
  campaignStatusNotice,
  campaignToFormValues,
  completedCampaignSteps,
  defaultCampaignFormValues,
  isAudienceStepComplete,
  isBookingStepComplete,
  isMessageStepComplete,
  isPreviewableAudienceRule,
  validateBookingUrl,
  validateLapsedDays,
  validateRequired,
  validateSmsBody,
  type CampaignFormValues,
  type CampaignStepId,
} from '../campaign-form-state';
import { insertTextAtCursor } from '../campaign-text';
import { useCampaigns } from '../hooks/use-campaigns';
import { useSendCampaign } from '../hooks/use-send-campaign';
import { useSmsSender } from '../hooks/use-sms-sender';
import { Checkbox } from '@/components/ui/checkbox';

export type { CampaignStepId } from '../campaign-form-state';

const campaignSteps: GuidedFlowStep<CampaignStepId>[] = [
  { id: 'audience', title: 'Audience' },
  { id: 'message', title: 'Message' },
  { id: 'booking', title: 'Booking' },
  { id: 'sender', title: 'Sender' },
  { id: 'test', title: 'Test SMS' },
  { id: 'review', title: 'Review' },
];

export function CampaignForm({
  campaign,
  initialStep,
  onCreated,
  onSent,
  organizationId,
}: {
  campaign: Campaign | null;
  initialStep?: CampaignStepId;
  onCreated: (campaignId: string, initialStep: CampaignStepId) => void;
  onSent?: (response: CampaignSendResponse) => void;
  organizationId: string | null;
}) {
  const campaignIsDraft = !campaign || campaign.status === 'draft';
  const canEditCampaign = campaignIsDraft;
  const canSendCampaign =
    Boolean(campaign) &&
    (campaign?.status === 'draft' || campaign?.status === 'ready_to_send');
  const [activeStep, setActiveStep] = useState<CampaignStepId>(
    initialStep ?? (campaignIsDraft ? 'audience' : 'review'),
  );
  const [queuedRecipientCount, setQueuedRecipientCount] = useState<number | null>(
    null,
  );
  const [testSmsStepComplete, setTestSmsStepComplete] = useState(false);
  const [
    recentCampaignExclusionAcknowledged,
    setRecentCampaignExclusionAcknowledged,
  ] = useState(false);
  const messageTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const createCampaign = useCreateCampaign(organizationId);
  const campaigns = useCampaigns({
    enabled: Boolean(organizationId && canEditCampaign),
    organizationId,
  });
  const sender = useSmsSender(organizationId);
  const sendCampaign = useSendCampaign({
    campaignId: campaign?.id ?? null,
    organizationId,
  });
  const campaignNotice = campaign ? campaignStatusNotice(campaign) : null;
  const updateCampaign = useUpdateCampaign({
    campaignId: campaign?.id ?? null,
    organizationId,
  });
  const actionError =
    createCampaign.error ?? updateCampaign.error ?? sendCampaign.error;
  const isSaving = createCampaign.isPending || updateCampaign.isPending;
  const isSending = sendCampaign.isPending;
  const sendQueued =
    queuedRecipientCount !== null &&
    campaign?.status !== 'sending' &&
    campaign?.status !== 'sent' &&
    campaign?.status !== 'failed';
  const form = useForm({
    defaultValues: campaign
      ? campaignToFormValues(campaign)
      : defaultCampaignFormValues,
    onSubmit: async ({ value }) => {
      if (!canEditCampaign) {
        return;
      }

      const input = campaignFormValuesToCompleteInput(value);

      if (campaign) {
        await updateCampaign.mutateAsync(input);
        return;
      }

      const response = await createCampaign.mutateAsync(input);

      onCreated(response.campaign.id, 'review');
    },
  });

  async function saveStepAndContinue(
    values: CampaignFormValues,
    stepInput: CreateCampaignDraftInput | UpdateCampaignDraftInput,
    nextStep: CampaignStepId,
  ) {
    if (!canEditCampaign) {
      setActiveStep(nextStep);
      return;
    }

    if (campaign) {
      await updateCampaign.mutateAsync(stepInput);
      setActiveStep(nextStep);
      return;
    }

    const response = await createCampaign.mutateAsync(
      campaignFormValuesToInitialDraftInput(values),
    );

    onCreated(response.campaign.id, nextStep);
  }

  return (
    <form
      className="grid gap-7"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {campaignNotice ? (
        <ItemNotice
          description={campaignNotice.description}
          title={campaignNotice.title}
        />
      ) : null}

      {sendQueued ? (
        <ItemNotice
          description={`${queuedRecipientCount} ${
            queuedRecipientCount === 1 ? 'recipient is' : 'recipients are'
          } queued for sending.`}
          title="Campaign send queued"
          variant="success"
        />
      ) : null}

      {actionError ? (
        <ItemNotice
          description={
            actionError instanceof Error
              ? actionError.message
              : 'Try checking the campaign fields and saving again.'
          }
          title={
            sendCampaign.error
              ? 'Campaign could not be sent'
              : 'Campaign could not be saved'
          }
          variant="error"
        />
      ) : null}

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
          values: state.values,
        })}
      >
        {({ canSubmit, isSubmitting, values }) => {
          const senderReady = sender.data?.sender?.status === 'ready';
          const exclusionCampaigns = (campaigns.data?.campaigns ?? []).filter(
            (candidate) =>
              candidate.id !== campaign?.id &&
              ['sending', 'sent', 'failed'].includes(candidate.status),
          );
          const recentProtectionAckRequired =
            requiresRecentCampaignExclusionAcknowledgement(values.audienceRule);
          const completedStepIds = completedCampaignSteps(
            values,
            senderReady,
            testSmsStepComplete,
          );

          return (
            <GuidedFlowFrame
              completedStepIds={completedStepIds}
              currentStepId={activeStep}
              progressLabel="Campaign setup"
              steps={campaignSteps}
            >
              <div className="grid gap-5">
                {activeStep === 'audience' ? (
                  <div className="grid gap-5">
                      <AppPageSection
                        description="Name this campaign and choose the lapsed booking window."
                        title="Campaign and booking window"
                      >
                        <div className="grid gap-5">
                          <form.Field
                            name="name"
                            validators={{
                              onBlur: ({ value }) =>
                                validateRequired(value, 'Enter a campaign name.'),
                              onSubmit: ({ value }) =>
                                validateRequired(value, 'Enter a campaign name.'),
                            }}
                          >
                            {(field) => (
                              <CampaignTextInput
                                disabled={!canEditCampaign}
                                error={getFieldError(field.state.meta.errors)}
                                label="Campaign name"
                                name={field.name}
                                onBlur={field.handleBlur}
                                onChange={field.handleChange}
                                placeholder="90-day reactivation..."
                                spellCheck={false}
                                value={field.state.value}
                              />
                            )}
                          </form.Field>

                          <form.Field
                            name="audienceRule.lapsedDays"
                            validators={{
                              onBlur: ({ value }) => validateLapsedDays(value),
                              onSubmit: ({ value }) => validateLapsedDays(value),
                            }}
                          >
                            {(lapsedDaysField) => (
                              <form.Field name="audienceRule.includeNoBookingDate">
                                {(includeNoBookingDateField) => (
                                  <div className="grid gap-2">
                                    <AudienceRuleFields
                                      disabled={!canEditCampaign}
                                      includeNoBookingDate={
                                        includeNoBookingDateField.state.value
                                      }
                                      lapsedDays={lapsedDaysField.state.value}
                                      onIncludeNoBookingDateChange={
                                        includeNoBookingDateField.handleChange
                                      }
                                      onLapsedDaysChange={
                                        lapsedDaysField.handleChange
                                      }
                                    />
                                    {getFieldError(
                                      lapsedDaysField.state.meta.errors,
                                    ) ? (
                                      <p
                                        aria-live="polite"
                                        className={textStyles.error}
                                      >
                                        {getFieldError(
                                          lapsedDaysField.state.meta.errors,
                                        )}
                                      </p>
                                    ) : null}
                                  </div>
                                )}
                              </form.Field>
                            )}
                          </form.Field>
                        </div>
                      </AppPageSection>

                      <AppPageSection
                        description="Avoid overlapping campaign sends before this campaign is launched."
                        title="Exclusions"
                      >
                        <form.Field name="audienceRule.recentCampaignExclusionDays">
                          {(recentCampaignExclusionDaysField) => (
                            <form.Field name="audienceRule.excludeCampaignIds">
                              {(excludeCampaignIdsField) => (
                                <AudienceExclusionFields
                                  campaigns={exclusionCampaigns}
                                  disabled={!canEditCampaign}
                                  excludeCampaignIds={
                                    excludeCampaignIdsField.state.value
                                  }
                                  onExcludeCampaignIdsChange={
                                    excludeCampaignIdsField.handleChange
                                  }
                                  onRecentCampaignExclusionDaysChange={
                                    recentCampaignExclusionDaysField.handleChange
                                  }
                                  recentCampaignExclusionDays={
                                    recentCampaignExclusionDaysField.state.value
                                  }
                                />
                              )}
                            </form.Field>
                          )}
                        </form.Field>
                      </AppPageSection>

                      <AppPageSection
                        description="See how the current audience rules affect the final sendable audience."
                        title="Matching contacts"
                      >
                        <AudiencePreview
                          audienceRule={values.audienceRule}
                          enabled={isPreviewableAudienceRule(values.audienceRule)}
                          organizationId={organizationId}
                        />
                      </AppPageSection>

                      <GuidedFlowActions
                        canContinue={isAudienceStepComplete(values)}
                        continueLabel="Continue to message"
                        isPending={isSaving}
                        onContinue={() => {
                          void saveStepAndContinue(
                            values,
                            campaignFormValuesToAudienceInput(values),
                            'message',
                          );
                        }}
                      />
                  </div>
                ) : null}

                    {activeStep === 'message' ? (
                      <CampaignSetupStep
                        description="Write the SMS and check the preview before continuing."
                        title="Write the message"
                      >
                        <div className="grid gap-5">
                    <form.Field
                      name="smsBody"
                      validators={{
                        onBlur: ({ value }) => validateSmsBody(value),
                        onSubmit: ({ value }) => validateSmsBody(value),
                      }}
                    >
                      {(field) => (
                        <div className="grid gap-6 lg:grid-cols-2">
                          <div className="grid content-start gap-5">
                            <CampaignTextAreaInput
                              disabled={!canEditCampaign}
                              error={getFieldError(field.state.meta.errors)}
                              label="Message body"
                              name={field.name}
                              onBlur={field.handleBlur}
                              onChange={field.handleChange}
                              placeholder="Hi {first_name}, we have openings this week..."
                              textAreaRef={messageTextAreaRef}
                              value={field.state.value}
                            />
                            <MessageEstimate smsBody={field.state.value} />
                            <div className="grid gap-2">
                              <p className={textStyles.metaStrong}>
                                Personalize
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {['{first_name}', '{last_booking_date}'].map(
                                  (token) => (
                                    <Button
                                      disabled={!canEditCampaign}
                                      key={token}
                                      onClick={() => {
                                        field.handleChange(
                                          insertTextAtCursor({
                                            currentValue: field.state.value,
                                            insertText: token,
                                            textArea: messageTextAreaRef.current,
                                          }),
                                        );
                                      }}
                                      size="sm"
                                      type="button"
                                      variant="outline"
                                    >
                                      {token}
                                    </Button>
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                          <MessagePreview smsBody={field.state.value} />
                        </div>
                      )}
                    </form.Field>

                          <GuidedFlowActions
                            canContinue={isMessageStepComplete(values)}
                            continueLabel="Continue to booking"
                            onBack={() => setActiveStep('audience')}
                            isPending={isSaving}
                            onContinue={() => {
                              void saveStepAndContinue(
                                values,
                                campaignFormValuesToMessageInput(values),
                                'booking',
                              );
                            }}
                          />
                        </div>
                      </CampaignSetupStep>
                    ) : null}

                    {activeStep === 'booking' ? (
                      <CampaignSetupStep
                        description="Add the destination link and optional reference used when reviewing results."
                        title="Add the booking details"
                      >
                        <div className="grid gap-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <form.Field
                        name="bookingUrl"
                        validators={{
                          onBlur: ({ value }) => validateBookingUrl(value),
                          onSubmit: ({ value }) => validateBookingUrl(value),
                        }}
                      >
                        {(field) => (
                          <CampaignTextInput
                            disabled={!canEditCampaign}
                            error={getFieldError(field.state.meta.errors)}
                            label="Booking URL"
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={field.handleChange}
                            placeholder="https://booking.example.com..."
                            type="url"
                            value={field.state.value}
                          />
                        )}
                      </form.Field>
                      <form.Field name="campaignCode">
                        {(field) => (
                          <CampaignTextInput
                            disabled={!canEditCampaign}
                            error={getFieldError(field.state.meta.errors)}
                            label="Campaign code or reference"
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={field.handleChange}
                            placeholder="SPRING REACTIVATION..."
                            spellCheck={false}
                            value={field.state.value}
                          />
                        )}
                      </form.Field>
                    </div>

                          <GuidedFlowActions
                            canContinue={isBookingStepComplete(values)}
                            continueLabel="Continue to sender"
                            onBack={() => setActiveStep('message')}
                            isPending={isSaving}
                            onContinue={() => {
                              void saveStepAndContinue(
                                values,
                                campaignFormValuesToBookingInput(values),
                                'sender',
                              );
                            }}
                          />
                        </div>
                      </CampaignSetupStep>
                    ) : null}

                    {activeStep === 'sender' ? (
                      <CampaignSetupStep
                        description="Choose the number recipients will see before this campaign can send."
                        title={senderReady ? 'Sender ready' : 'Set up the sender'}
                      >
                        <div className="grid gap-5">
                          <SenderSetup
                            organizationId={organizationId}
                            sender={sender.data?.sender ?? null}
                          />

                          <GuidedFlowActions
                            canContinue={senderReady}
                            continueLabel="Continue to test SMS"
                            isPending={sender.isLoading}
                            onBack={() => setActiveStep('booking')}
                            onContinue={() => setActiveStep('test')}
                          />
                        </div>
                      </CampaignSetupStep>
                    ) : null}

                    {activeStep === 'test' ? (
                      <CampaignSetupStep
                        description="Send yourself the message before launching, or skip this check."
                        title="Send a test SMS"
                      >
                        <CampaignTestSms
                          campaignId={campaign?.id ?? null}
                          onBack={() => setActiveStep('sender')}
                          onSent={() => {
                            setTestSmsStepComplete(true);
                            setActiveStep('review');
                          }}
                          onSkip={() => {
                            setTestSmsStepComplete(true);
                            setActiveStep('review');
                          }}
                          senderReady={senderReady}
                        />
                      </CampaignSetupStep>
                    ) : null}

                    {activeStep === 'review' ? (
                      <CampaignSetupStep
                        description="Confirm the final setup before sending the campaign."
                        title="Review campaign"
                      >
                        <div className="grid gap-5">
                          <CampaignReview
                            campaign={campaign}
                            organizationId={organizationId}
                            senderReady={senderReady}
                            values={values}
                          />

                          {recentProtectionAckRequired ? (
                            <label className="flex items-start gap-3 text-amber-950">
                              <Checkbox
                                checked={recentCampaignExclusionAcknowledged}
                                onCheckedChange={(value) =>
                                  setRecentCampaignExclusionAcknowledged(
                                    value === true,
                                  )
                                }
                              />
                              <span className="grid gap-1">
                                <span className={textStyles.itemTitle}>
                                  Confirm recent campaign protection
                                </span>
                                <span className={textStyles.meta}>
                                  Some contacts may receive another campaign
                                  sooner than the standard 30 days.
                                </span>
                              </span>
                            </label>
                          ) : null}

                          <GuidedFlowActions onBack={() => setActiveStep('test')}>
                            <Button
                              disabled={
                                !canSendCampaign ||
                                !canSubmit ||
                                !senderReady ||
                                !campaign ||
                                isSaving ||
                                isSubmitting ||
                                isSending ||
                                sendQueued ||
                                (recentProtectionAckRequired &&
                                  !recentCampaignExclusionAcknowledged)
                              }
                              onClick={() => {
                                sendCampaign.mutate(
                                  {
                                    recentCampaignExclusionAcknowledged:
                                      recentCampaignExclusionAcknowledged,
                                  },
                                  {
                                    onSuccess: (response) => {
                                      setQueuedRecipientCount(
                                        response.recipientCount,
                                      );
                                      toast.success('Campaign send queued.', {
                                        description: `${
                                          response.recipientCount
                                        } ${
                                          response.recipientCount === 1
                                            ? 'recipient'
                                            : 'recipients'
                                        } selected.`,
                                      });
                                      onSent?.(response);
                                    },
                                  },
                                );
                              }}
                              type="button"
                            >
                              <Send aria-hidden="true" data-icon="inline-start" />
                              {isSending ? 'Sending campaign...' : 'Send campaign'}
                            </Button>
                          </GuidedFlowActions>
                        </div>
                      </CampaignSetupStep>
                    ) : null}
              </div>
            </GuidedFlowFrame>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

function CampaignSetupStep({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <GuidedFlowSection description={description} title={title}>
      <AppPageItem asChild>
        <section>{children}</section>
      </AppPageItem>
    </GuidedFlowSection>
  );
}
