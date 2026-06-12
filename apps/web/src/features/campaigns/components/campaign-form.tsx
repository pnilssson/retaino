"use client";

import {
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
import {
  ArrowRight,
  Send,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  GuidedFlowActions,
  GuidedFlowFrame,
  GuidedFlowSection,
  type GuidedFlowStep,
} from '@/components/guided-flow';
import { InfoTooltip } from '@/components/info-tooltip';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { useCreateCampaign } from '@/features/campaigns/hooks/use-create-campaign';
import { useUpdateCampaign } from '@/features/campaigns/hooks/use-update-campaign';
import { ContentSection } from '@/features/appshell/components/content-section';
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
import {
  MessageEstimate,
  MessagePreview,
} from './message-preview';
import { SenderSetup } from './sender-setup';
import {
  campaignFormValuesToAudienceInput,
  campaignFormValuesToCompleteInput,
  campaignFormValuesToInitialDraftInput,
  campaignFormValuesToMessageAndLinkInput,
  campaignStatusNotice,
  campaignToFormValues,
  completedCampaignSteps,
  defaultCampaignFormValues,
  isAudienceStepComplete,
  isMessageAndLinkStepComplete,
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

function campaignSetupSteps(
  includeSenderStep: boolean,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
): GuidedFlowStep<CampaignStepId>[] {
  return [
    { id: 'audience', title: t('stepAudience') },
    { id: 'message', title: t('stepMessage') },
    ...(includeSenderStep
      ? [{ id: 'sender' as const, title: t('stepSender') }]
      : []),
    { id: 'review', title: t('stepReview') },
  ];
}

export function CampaignForm({
  campaign,
  defaultSenderCountryCode,
  initialStep,
  onCreated,
  onSent,
  organizationId,
}: {
  campaign: Campaign | null;
  defaultSenderCountryCode: string;
  initialStep?: CampaignStepId;
  onCreated: (campaignId: string, initialStep: CampaignStepId) => void;
  onSent?: (response: CampaignSendResponse) => void;
  organizationId: string | null;
}) {
  const t = useTranslations('Campaigns');
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
  const campaignNotice = campaign ? campaignStatusNotice(campaign, t) : null;
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
          description={t('queuedForSending', {
            count: `${queuedRecipientCount} ${t(
              queuedRecipientCount === 1 ? 'recipient' : 'recipients',
            )}`,
          })}
          title={t('campaignSendQueuedTitle')}
          variant="success"
        />
      ) : null}

      {actionError ? (
        <ItemNotice
          description={
            actionError instanceof Error
              ? actionError.message
              : t('campaignSaveErrorDescription')
          }
          title={
            sendCampaign.error
              ? t('campaignSendErrorTitle')
              : t('campaignSaveErrorTitle')
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
          const includeSenderStep = !senderReady || activeStep === 'sender';
          const visibleSteps = campaignSetupSteps(includeSenderStep, t);
          const completedStepIds = completedCampaignSteps(
            values,
            senderReady,
          );

          return (
            <GuidedFlowFrame
              completedStepIds={completedStepIds}
              currentStepId={activeStep}
              progressLabel={t('campaignSetup')}
              steps={visibleSteps}
            >
              <div className="grid gap-5">
                {activeStep === 'audience' ? (
                  <div className="grid gap-5">
                      <ContentSection
                        description={t('campaignAndBookingWindowDescription')}
                        title={t('campaignAndBookingWindow')}
                      >
                        <div className="grid gap-5">
                          <form.Field
                            name="name"
                            validators={{
                              onBlur: ({ value }) =>
                                validateRequired(value, t('campaignNameRequired')),
                              onSubmit: ({ value }) =>
                                validateRequired(value, t('campaignNameRequired')),
                            }}
                          >
                            {(field) => (
                              <CampaignTextInput
                                disabled={!canEditCampaign}
                                error={getFieldError(field.state.meta.errors)}
                                label={t('campaignName')}
                                name={field.name}
                                onBlur={field.handleBlur}
                                onChange={field.handleChange}
                                placeholder={t('campaignNamePlaceholder')}
                                spellCheck={false}
                                value={field.state.value}
                              />
                            )}
                          </form.Field>

                          <form.Field
                            name="audienceRule.lapsedDays"
                            validators={{
                              onBlur: ({ value }) => validateLapsedDays(value, t),
                              onSubmit: ({ value }) => validateLapsedDays(value, t),
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
                      </ContentSection>

                      <ContentSection
                        description={t('exclusionsDescription')}
                        title={t('exclusions')}
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
                      </ContentSection>

                      <ContentSection
                        description={t('matchingContactsDescription')}
                        title={t('matchingContacts')}
                      >
                        <AudiencePreview
                          audienceRule={values.audienceRule}
                          enabled={isPreviewableAudienceRule(values.audienceRule)}
                          organizationId={organizationId}
                        />
                      </ContentSection>

                      <GuidedFlowActions
                        canContinue={isAudienceStepComplete(values)}
                        continueIcon={
                          <ArrowRight aria-hidden="true" className="size-4" />
                        }
                        continueLabel={t('continueToMessage')}
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
                      <GuidedFlowSection
                        description={t('messageAndLinkDescription')}
                        title={t('messageAndLink')}
                      >
                        <div className="grid gap-5">
                          <ContentSection asChild>
                            <section>
                              <form.Field
                                name="smsBody"
                                validators={{
                                  onBlur: ({ value }) => validateSmsBody(value, t),
                                  onSubmit: ({ value }) => validateSmsBody(value, t),
                                }}
                              >
                                {(field) => (
                                  <div className="grid gap-6 lg:grid-cols-2">
                                    <div className="grid content-start gap-5">
                                      <CampaignTextAreaInput
                                        disabled={!canEditCampaign}
                                        error={getFieldError(
                                          field.state.meta.errors,
                                        )}
                                        label={t('messageBody')}
                                        name={field.name}
                                        onBlur={field.handleBlur}
                                        onChange={field.handleChange}
                                        placeholder={t('messageBodyPlaceholder', {
                                          first_name: '{first_name}',
                                        })}
                                        textAreaRef={messageTextAreaRef}
                                        value={field.state.value}
                                      />
                                      <div className="grid gap-2">
                                        <div className="flex items-center gap-1.5">
                                          <p className={textStyles.itemTitle}>
                                            {t('personalize')}
                                          </p>
                                          <InfoTooltip label={t('personalizationDetails')}>
                                            {t('personalizationDescription')}
                                          </InfoTooltip>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                          {[
                                            '{first_name}',
                                            '{last_booking_date}',
                                          ].map((token) => (
                                            <Button
                                              disabled={!canEditCampaign}
                                              key={token}
                                              onClick={() => {
                                                field.handleChange(
                                                  insertTextAtCursor({
                                                    currentValue:
                                                      field.state.value,
                                                    insertText: token,
                                                    textArea:
                                                      messageTextAreaRef.current,
                                                  }),
                                                );
                                              }}
                                              size="sm"
                                              type="button"
                                              variant="outline"
                                            >
                                              {token}
                                            </Button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="grid content-start gap-2">
                                      <MessagePreview
                                        smsBody={field.state.value}
                                      />
                                      <MessageEstimate
                                        smsBody={field.state.value}
                                      />
                                    </div>
                                  </div>
                                )}
                              </form.Field>
                            </section>
                          </ContentSection>

                          <ContentSection
                            description={t('bookingDestinationDescription')}
                            title={t('bookingDestination')}
                          >
                            <div className="grid gap-4 sm:grid-cols-2">
                              <form.Field
                                name="bookingUrl"
                                validators={{
                                  onBlur: ({ value }) =>
                                    validateBookingUrl(value, t),
                                  onSubmit: ({ value }) =>
                                    validateBookingUrl(value, t),
                                }}
                              >
                                {(field) => (
                                  <CampaignTextInput
                                    disabled={!canEditCampaign}
                                    error={getFieldError(
                                      field.state.meta.errors,
                                    )}
                                    label={t('bookingUrl')}
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
                                    error={getFieldError(
                                      field.state.meta.errors,
                                    )}
                                    label={t('campaignCodeOrReference')}
                                    name={field.name}
                                    onBlur={field.handleBlur}
                                    onChange={field.handleChange}
                                    placeholder={t('campaignCodePlaceholder')}
                                    spellCheck={false}
                                    value={field.state.value}
                                  />
                                )}
                              </form.Field>
                            </div>
                          </ContentSection>

                          <GuidedFlowActions
                            canContinue={isMessageAndLinkStepComplete(values)}
                            continueIcon={
                              <ArrowRight aria-hidden="true" className="size-4" />
                            }
                            continueLabel={
                              senderReady
                                ? t('continueToReview')
                                : t('continueToSender')
                            }
                            onBack={() => setActiveStep('audience')}
                            isPending={isSaving}
                            onContinue={() => {
                              void saveStepAndContinue(
                                values,
                                campaignFormValuesToMessageAndLinkInput(values),
                                senderReady ? 'review' : 'sender',
                              );
                            }}
                          />
                        </div>
                      </GuidedFlowSection>
                    ) : null}

                    {activeStep === 'sender' ? (
                      <GuidedFlowSection
                        description={t('senderStepDescription')}
                        title={senderReady ? t('senderReady') : t('setUpTheSender')}
                      >
                        <ContentSection asChild>
                          <section>
                            <SenderSetup
                              defaultCountryCode={defaultSenderCountryCode}
                              organizationId={organizationId}
                              sender={sender.data?.sender ?? null}
                            />
                          </section>
                        </ContentSection>

                        <GuidedFlowActions
                          canContinue={senderReady}
                          continueIcon={
                            <ArrowRight aria-hidden="true" className="size-4" />
                          }
                          continueLabel={t('continueToReview')}
                          isPending={sender.isLoading}
                          onBack={() => setActiveStep('message')}
                          onContinue={() => setActiveStep('review')}
                        />
                      </GuidedFlowSection>
                    ) : null}

                    {activeStep === 'review' ? (
                      <GuidedFlowSection
                        description={t('reviewCampaignDescription')}
                        title={t('reviewCampaign')}
                      >
                        <div className="grid gap-5">
                          <ContentSection asChild>
                            <section>
                              <CampaignReview
                                campaign={campaign}
                                organizationId={organizationId}
                                senderReady={senderReady}
                                values={values}
                              />
                            </section>
                          </ContentSection>

                          {recentProtectionAckRequired ? (
                            <ContentSection>
                              <ItemNotice
                                action={
                                  <label className="flex items-center gap-2">
                                    <Checkbox
                                      checked={recentCampaignExclusionAcknowledged}
                                      onCheckedChange={(value) =>
                                        setRecentCampaignExclusionAcknowledged(
                                          value === true,
                                        )
                                      }
                                    />
                                    <span className={textStyles.itemTitle}>
                                      {t('iUnderstand')}
                                    </span>
                                  </label>
                                }
                                description={t('confirmRecentCampaignProtectionDescription')}
                                title={t('confirmRecentCampaignProtection')}
                                variant="warning"
                              />
                            </ContentSection>
                          ) : null}

                          <ContentSection
                            description={t('sendTestSmsDescription')}
                            title={t('sendTestSms')}
                          >
                            <CampaignTestSms
                              campaignId={campaign?.id ?? null}
                              defaultCountryCode={defaultSenderCountryCode}
                              organizationId={organizationId}
                              senderReady={senderReady}
                            />
                          </ContentSection>

                          <GuidedFlowActions
                            onBack={() =>
                              setActiveStep(
                                includeSenderStep ? 'sender' : 'message',
                              )
                            }
                          >
                            <Button
                              disabled={
                                !canSendCampaign ||
                                !canSubmit ||
                                !isAudienceStepComplete(values) ||
                                !isMessageAndLinkStepComplete(values) ||
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
                                      toast.success(t('campaignSendQueuedToast'), {
                                        description: t('selectedRecipientsToast', {
                                          count: response.recipientCount,
                                        }),
                                      });
                                      onSent?.(response);
                                    },
                                  },
                                );
                              }}
                              type="button"
                            >
                              <Send aria-hidden="true" data-icon="inline-start" />
                              {isSending ? t('sendingCampaign') : t('sendCampaign')}
                            </Button>
                          </GuidedFlowActions>
                        </div>
                      </GuidedFlowSection>
                    ) : null}
              </div>
            </GuidedFlowFrame>
          );
        }}
      </form.Subscribe>
    </form>
  );
}
