"use client";

import {
  useRef,
  useState,
  type InputHTMLAttributes,
  type Ref,
} from 'react';
import { useForm } from '@tanstack/react-form';
import type {
  Campaign,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCampaign } from '@/features/campaigns/hooks/use-create-campaign';
import { useUpdateCampaign } from '@/features/campaigns/hooks/use-update-campaign';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import { getFieldError } from '@/lib/form-errors';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { AudiencePreview } from './audience-preview';
import { AudienceRuleFields } from './audience-rule-fields';
import { CampaignReview } from './campaign-review';
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
import { useSendCampaign } from '../hooks/use-send-campaign';
import { useSmsSender } from '../hooks/use-sms-sender';

export type { CampaignStepId } from '../campaign-form-state';

const campaignSteps: GuidedFlowStep<CampaignStepId>[] = [
  { id: 'audience', title: 'Audience' },
  { id: 'message', title: 'Message' },
  { id: 'booking', title: 'Booking' },
  { id: 'sender', title: 'Sender' },
  { id: 'review', title: 'Review' },
];

export function CampaignForm({
  campaign,
  initialStep,
  onCreated,
  organizationId,
}: {
  campaign: Campaign | null;
  initialStep?: CampaignStepId;
  onCreated: (campaignId: string, initialStep: CampaignStepId) => void;
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
  const messageTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const createCampaign = useCreateCampaign(organizationId);
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
          tone="destructive"
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
          const completedStepIds = completedCampaignSteps(values, senderReady);

          return (
            <GuidedFlowFrame
              completedStepIds={completedStepIds}
              currentStepId={activeStep}
              progressLabel="Campaign setup"
              steps={campaignSteps}
            >
              <AppPageContent>
                <AppPageItem asChild>
                  <section>
                    {activeStep === 'audience' ? (
                      <GuidedFlowSection
                        title="Choose the audience"
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
                        <TextInput
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
                                disabled={!canEditCampaign}
                              />
                              {getFieldError(
                                lapsedDaysField.state.meta.errors,
                              ) ? (
                                <p aria-live="polite" className={textStyles.error}>
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

                    <AudiencePreview
                      audienceRule={values.audienceRule}
                      enabled={isPreviewableAudienceRule(values.audienceRule)}
                      organizationId={organizationId}
                    />

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
                      </GuidedFlowSection>
                    ) : null}

                    {activeStep === 'message' ? (
                      <GuidedFlowSection
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
                            <TextAreaInput
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
                      </GuidedFlowSection>
                    ) : null}

                    {activeStep === 'booking' ? (
                      <GuidedFlowSection
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
                          <TextInput
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
                          <TextInput
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
                      </GuidedFlowSection>
                    ) : null}

                    {activeStep === 'sender' ? (
                      <GuidedFlowSection title="Set up the sender">
                        <div className="grid gap-5">
                          <SenderSetup
                            organizationId={organizationId}
                            sender={sender.data?.sender ?? null}
                          />

                          <GuidedFlowActions
                            canContinue={senderReady}
                            continueLabel="Review campaign"
                            isPending={sender.isLoading}
                            onBack={() => setActiveStep('booking')}
                            onContinue={() => setActiveStep('review')}
                          />
                        </div>
                      </GuidedFlowSection>
                    ) : null}

                    {activeStep === 'review' ? (
                      <GuidedFlowSection
                        title="Review campaign"
                      >
                        <div className="grid gap-5">
                    <CampaignReview
                      campaign={campaign}
                      campaignId={campaign?.id ?? null}
                      organizationId={organizationId}
                      senderReady={senderReady}
                      values={values}
                    />

                          <GuidedFlowActions onBack={() => setActiveStep('sender')}>
                            <Button
                              disabled={
                                !canSendCampaign ||
                                !canSubmit ||
                                !senderReady ||
                                !campaign ||
                                isSaving ||
                                isSubmitting ||
                                isSending ||
                                sendQueued
                              }
                              onClick={() => {
                                sendCampaign.mutate(undefined, {
                                  onSuccess: (response) => {
                                    setQueuedRecipientCount(response.recipientCount);
                                    toast.success('Campaign send queued.', {
                                      description: `${response.recipientCount} ${
                                        response.recipientCount === 1
                                          ? 'recipient'
                                          : 'recipients'
                                      } selected.`,
                                    });
                                  },
                                });
                              }}
                              type="button"
                            >
                              <Send aria-hidden="true" data-icon="inline-start" />
                              {isSending ? 'Sending campaign...' : 'Send campaign'}
                            </Button>
                          </GuidedFlowActions>
                        </div>
                      </GuidedFlowSection>
                    ) : null}
                  </section>
                </AppPageItem>
              </AppPageContent>
            </GuidedFlowFrame>
          );
        }}
      </form.Subscribe>
    </form>
  );
}

function insertTextAtCursor({
  currentValue,
  insertText,
  textArea,
}: {
  currentValue: string;
  insertText: string;
  textArea: HTMLTextAreaElement | null;
}) {
  if (!textArea) {
    return `${currentValue}${insertText}`;
  }

  const selectionStart = textArea.selectionStart;
  const selectionEnd = textArea.selectionEnd;
  const nextValue = `${currentValue.slice(0, selectionStart)}${insertText}${currentValue.slice(selectionEnd)}`;
  const nextCursorPosition = selectionStart + insertText.length;

  window.requestAnimationFrame(() => {
    textArea.focus();
    textArea.setSelectionRange(nextCursorPosition, nextCursorPosition);
  });

  return nextValue;
}

function TextInput({
  autoComplete = 'off',
  disabled,
  error,
  inputMode,
  label,
  name,
  onBlur,
  onChange,
  placeholder,
  spellCheck,
  type = 'text',
  value,
}: {
  autoComplete?: string;
  disabled: boolean;
  error: string | null;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  spellCheck?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        disabled={disabled}
        id={name}
        inputMode={inputMode}
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={spellCheck}
        type={type}
        value={value}
      />
      {error ? (
        <p aria-live="polite" className={textStyles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
function TextAreaInput({
  disabled,
  error,
  label,
  name,
  onBlur,
  onChange,
  placeholder,
  textAreaRef,
  value,
}: {
  disabled: boolean;
  error: string | null;
  label: string;
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  textAreaRef?: Ref<HTMLTextAreaElement>;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        aria-invalid={Boolean(error)}
        autoComplete="off"
        className={cn(
          'min-h-36 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base leading-6 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30',
        )}
        disabled={disabled}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={textAreaRef}
        value={value}
      />
      {error ? (
        <p aria-live="polite" className={textStyles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
