"use client";

import { useRef, useState, type ReactNode, type Ref } from 'react';
import { useForm } from '@tanstack/react-form';
import type {
  Campaign,
  CampaignAudienceRule,
  CreateCampaignDraftInput,
  UpdateCampaignDraftInput,
} from '@retaino/shared/contracts';
import { createCampaignSmsPreview } from '@retaino/shared';
import { Save } from 'lucide-react';
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
import { useCampaignAudiencePreview } from '../hooks/use-campaign-audience-preview';

type CampaignFormValues = {
  name: string;
  audienceRule: CampaignAudienceRule;
  smsBody: string;
  bookingUrl: string;
  campaignCode: string;
  attributionWindowDays: number;
};

export type CampaignStepId = 'audience' | 'message' | 'booking' | 'review';

const campaignSteps: GuidedFlowStep<CampaignStepId>[] = [
  { id: 'audience', title: 'Audience' },
  { id: 'message', title: 'Message' },
  { id: 'booking', title: 'Booking' },
  { id: 'review', title: 'Review' },
];

const defaultCampaignFormValues: CampaignFormValues = {
  name: '',
  audienceRule: {
    lapsedDays: 90,
    includeNoBookingDate: false,
  },
  smsBody: '',
  bookingUrl: '',
  campaignCode: '',
  attributionWindowDays: 7,
};

export function CampaignForm({
  canManageCampaigns,
  campaign,
  initialStep = 'audience',
  onCreated,
  organizationId,
}: {
  canManageCampaigns: boolean;
  campaign: Campaign | null;
  initialStep?: CampaignStepId;
  onCreated: (campaignId: string, initialStep: CampaignStepId) => void;
  organizationId: string | null;
}) {
  const [activeStep, setActiveStep] = useState<CampaignStepId>(initialStep);
  const messageTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const createCampaign = useCreateCampaign(organizationId);
  const updateCampaign = useUpdateCampaign({
    campaignId: campaign?.id ?? null,
    organizationId,
  });
  const saveError = createCampaign.error ?? updateCampaign.error;
  const isSaving = createCampaign.isPending || updateCampaign.isPending;
  const form = useForm({
    defaultValues: campaign
      ? campaignToFormValues(campaign)
      : defaultCampaignFormValues,
    onSubmit: async ({ value }) => {
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
    if (!canManageCampaigns) {
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
      {!canManageCampaigns ? (
        <ItemNotice
          description="You can inspect campaigns and audience previews, but only organization admins can save changes."
          title="Admin access required to save"
        />
      ) : null}

      {saveError ? (
        <ItemNotice
          description={
            saveError instanceof Error
              ? saveError.message
              : 'Try checking the campaign fields and saving again.'
          }
          title="Campaign could not be saved"
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
          const completedStepIds = completedCampaignSteps(values);

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
                          disabled={!canManageCampaigns}
                          error={getFieldError(field.state.meta.errors)}
                          label="Campaign name"
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                          placeholder="90-day reactivation"
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
                              />
                              {getFieldError(
                                lapsedDaysField.state.meta.errors,
                              ) ? (
                                <p className={textStyles.error}>
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
                              disabled={!canManageCampaigns}
                              error={getFieldError(field.state.meta.errors)}
                              label="Message body"
                              name={field.name}
                              onBlur={field.handleBlur}
                              onChange={field.handleChange}
                              placeholder="Hi {first_name}, we have openings this week."
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
                                      disabled={!canManageCampaigns}
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
                            disabled={!canManageCampaigns}
                            error={getFieldError(field.state.meta.errors)}
                            label="Booking URL"
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={field.handleChange}
                            placeholder="https://booking.example.com"
                            type="url"
                            value={field.state.value}
                          />
                        )}
                      </form.Field>
                      <form.Field name="campaignCode">
                        {(field) => (
                          <TextInput
                            disabled={!canManageCampaigns}
                            error={getFieldError(field.state.meta.errors)}
                            label="Campaign code or reference"
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={field.handleChange}
                            placeholder="SPRING REACTIVATION"
                            value={field.state.value}
                          />
                        )}
                      </form.Field>
                    </div>

                          <GuidedFlowActions
                            canContinue={isBookingStepComplete(values)}
                            continueLabel="Review campaign"
                            onBack={() => setActiveStep('message')}
                            isPending={isSaving}
                            onContinue={() => {
                              void saveStepAndContinue(
                                values,
                                campaignFormValuesToBookingInput(values),
                                'review',
                              );
                            }}
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
                      organizationId={organizationId}
                      values={values}
                    />

                          <GuidedFlowActions onBack={() => setActiveStep('booking')}>
                            <Button
                              disabled={
                                !canManageCampaigns ||
                                !canSubmit ||
                                isSaving ||
                                isSubmitting
                              }
                              type="submit"
                            >
                              <Save aria-hidden="true" data-icon="inline-start" />
                              {isSaving || isSubmitting ? 'Saving campaign' : 'Save campaign'}
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

function CampaignReview({
  organizationId,
  values,
}: {
  organizationId: string | null;
  values: CampaignFormValues;
}) {
  const audiencePreview = useCampaignAudiencePreview({
    audienceRule: values.audienceRule,
    enabled: isPreviewableAudienceRule(values.audienceRule),
    organizationId,
  });
  const smsPreview = createCampaignSmsPreview({ smsBody: values.smsBody });
  const eligibleCount = audiencePreview.data?.eligibleCount ?? null;
  const estimatedCredits =
    eligibleCount === null
      ? null
      : eligibleCount * smsPreview.estimatedSmsPerRecipient;
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
            {audiencePreview.isLoading
              ? 'Checking eligible contacts.'
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

function MessageEstimate({ smsBody }: { smsBody: string }) {
  const preview = createCampaignSmsPreview({ smsBody });
  const hasBody = Boolean(smsBody.trim());
  const estimatedSmsLabel = hasBody
    ? `${preview.estimatedSmsPerRecipient} SMS per recipient`
    : 'Not ready';

  return (
    <p className={textStyles.meta}>
      {hasBody ? preview.smsLength : 0} characters
      {', '}
      {estimatedSmsLabel}
    </p>
  );
}

function MessagePreview({
  showLabel = true,
  smsBody,
}: {
  showLabel?: boolean;
  smsBody: string;
}) {
  const preview = createCampaignSmsPreview({ smsBody });
  const hasBody = Boolean(smsBody.trim());

  return (
    <div className="grid content-start gap-2">
      {showLabel ? <Label>Recipient preview</Label> : null}
      <div
        className={cn(
          'min-h-36 rounded-lg bg-muted px-3 py-2',
          hasBody ? textStyles.body : textStyles.mutedBody,
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {hasBody ? preview.renderedBody : 'Your SMS preview appears here.'}
        </p>
      </div>
    </div>
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
  disabled,
  error,
  label,
  name,
  onBlur,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  disabled: boolean;
  error: string | null;
  label: string;
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        aria-invalid={Boolean(error)}
        disabled={disabled}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? <p className={textStyles.error}>{error}</p> : null}
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
      {error ? <p className={textStyles.error}>{error}</p> : null}
    </div>
  );
}

function campaignToFormValues(campaign: Campaign): CampaignFormValues {
  return {
    name: campaign.name,
    audienceRule: campaign.audienceRule,
    smsBody: campaign.smsBody ?? '',
    bookingUrl: campaign.bookingUrl ?? '',
    campaignCode: campaign.campaignCode ?? '',
    attributionWindowDays: campaign.attributionWindowDays,
  };
}

function campaignFormValuesToInitialDraftInput(
  values: CampaignFormValues,
): CreateCampaignDraftInput {
  return {
    name: values.name,
    audienceRule: values.audienceRule,
    smsBody: null,
    bookingUrl: null,
    campaignCode: null,
    attributionWindowDays: values.attributionWindowDays,
  };
}

function campaignFormValuesToAudienceInput(
  values: CampaignFormValues,
): UpdateCampaignDraftInput {
  return {
    name: values.name,
    audienceRule: values.audienceRule,
    attributionWindowDays: values.attributionWindowDays,
  };
}

function campaignFormValuesToMessageInput(
  values: CampaignFormValues,
): UpdateCampaignDraftInput {
  return {
    smsBody: values.smsBody,
  };
}

function campaignFormValuesToBookingInput(
  values: CampaignFormValues,
): UpdateCampaignDraftInput {
  return {
    bookingUrl: values.bookingUrl,
    campaignCode: values.campaignCode,
  };
}

function campaignFormValuesToCompleteInput(
  values: CampaignFormValues,
): CreateCampaignDraftInput {
  return {
    name: values.name,
    audienceRule: values.audienceRule,
    smsBody: values.smsBody,
    bookingUrl: values.bookingUrl,
    campaignCode: values.campaignCode,
    attributionWindowDays: values.attributionWindowDays,
  };
}

function completedCampaignSteps(values: CampaignFormValues): CampaignStepId[] {
  const completed: CampaignStepId[] = [];

  if (isAudienceStepComplete(values)) {
    completed.push('audience');
  }

  if (isMessageStepComplete(values)) {
    completed.push('message');
  }

  if (isBookingStepComplete(values)) {
    completed.push('booking');
  }

  if (
    isAudienceStepComplete(values) &&
    isMessageStepComplete(values) &&
    isBookingStepComplete(values)
  ) {
    completed.push('review');
  }

  return completed;
}

function isAudienceStepComplete(values: CampaignFormValues) {
  return (
    Boolean(values.name.trim()) && isPreviewableAudienceRule(values.audienceRule)
  );
}

function isMessageStepComplete(values: CampaignFormValues) {
  return !validateSmsBody(values.smsBody);
}

function isBookingStepComplete(values: CampaignFormValues) {
  return !validateBookingUrl(values.bookingUrl);
}

function validateRequired(value: string, message: string) {
  return value.trim() ? undefined : message;
}

function validateLapsedDays(value: number) {
  return Number.isInteger(value) && value >= 30 && value <= 365
    ? undefined
    : 'Choose a value from 30 to 365 days.';
}

function validateBookingUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? undefined
      : 'Enter an http or https booking URL.';
  } catch {
    return 'Enter an http or https booking URL.';
  }
}

function validateSmsBody(value: string) {
  if (!value.trim()) {
    return 'Enter the SMS message.';
  }

  const withoutAllowedTokens = value.replace(
    /\{(first_name|last_booking_date)\}/g,
    '',
  );

  return /[{}]/.test(withoutAllowedTokens)
    ? 'Only {first_name} and {last_booking_date} are supported.'
    : undefined;
}

function isPreviewableAudienceRule(rule: CampaignAudienceRule) {
  return (
    Number.isInteger(rule.lapsedDays) &&
    rule.lapsedDays >= 30 &&
    rule.lapsedDays <= 365
  );
}
