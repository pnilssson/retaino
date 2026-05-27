"use client";

import { useForm } from '@tanstack/react-form';
import type { CampaignSmsTestContact } from '@retaino/shared/contracts';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { GuidedFlowActions } from '@/components/guided-flow';
import { ItemNotice } from '@/components/item-notice';
import { PhoneInput } from '@/components/phone-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { textStyles } from '@/lib/text-styles';
import { useSendCampaignTestSms } from '../hooks/use-send-campaign-test-sms';
import { CampaignTestSampleContactSelect } from './campaign-test-sample-contact-select';

export function CampaignTestSms({
  campaignId,
  defaultCountryCode,
  onBack,
  onSent,
  onSkip,
  organizationId,
  senderReady,
}: {
  campaignId: string | null;
  defaultCountryCode: string;
  onBack?: () => void;
  onSent?: () => void;
  onSkip?: () => void;
  organizationId: string | null;
  senderReady: boolean;
}) {
  const testSend = useSendCampaignTestSms(campaignId);
  const [sampleContact, setSampleContact] =
    useState<CampaignSmsTestContact | null>(null);
  const form = useForm({
    defaultValues: {
      testPhone: '',
      testPhoneCountryCode: defaultCountryCode,
    },
    onSubmit: async ({ value }) => {
      const testPhone = value.testPhone.trim() || undefined;
      const response = await testSend.mutateAsync({
        sampleContactId: sampleContact?.id,
        testPhone,
        testPhoneCountryCode: testPhone
          ? value.testPhoneCountryCode
          : undefined,
      });

      toast.success('Test SMS sent.', {
        description: `${response.testSend.chargedCredits} SMS ${
          response.testSend.chargedCredits === 1 ? 'credit' : 'credits'
        } used.`,
      });
      onSent?.();
    },
  });

  return (
    <div className="grid gap-5">
      {!senderReady ? (
        <ItemNotice
          description="Set up the sender before sending a test SMS."
          title="Sender is not ready"
          variant="warning"
        />
      ) : null}

      <CampaignTestSampleContactSelect
        campaignId={campaignId}
        disabled={!campaignId || !senderReady || testSend.isPending}
        onSelect={setSampleContact}
        organizationId={organizationId}
        value={sampleContact}
      />

      <form.Field name="testPhone">
        {(field) => (
          <div className="grid gap-2">
            <Label htmlFor={field.name}>Test phone</Label>
            <PhoneInput
              countryCode={form.getFieldValue('testPhoneCountryCode')}
              disabled={!senderReady || testSend.isPending}
              id={field.name}
              name={field.name}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              onCountryChange={(value) =>
                form.setFieldValue('testPhoneCountryCode', value)
              }
              placeholder="701234567"
              value={field.state.value}
            />
            <p className={textStyles.mutedBody}>
              Send this test to a phone you control. Leave it blank to send the
              test SMS to the responsible contact number for your organization.
            </p>
          </div>
        )}
      </form.Field>

      {testSend.isError ? (
        <ItemNotice
          description={
            testSend.error instanceof Error
              ? testSend.error.message
              : 'Check the phone number and try again.'
          }
          title="Test SMS could not be sent"
          variant="error"
        />
      ) : null}

      <GuidedFlowActions onBack={onBack}>
        {onSkip ? (
          <Button
            disabled={testSend.isPending}
            onClick={onSkip}
            type="button"
            variant="outline"
          >
            Skip
          </Button>
        ) : null}
        <Button
          disabled={!campaignId || !senderReady || testSend.isPending}
          onClick={() => void form.handleSubmit()}
          type="button"
        >
          <Send aria-hidden="true" data-icon="inline-start" />
          {testSend.isPending ? 'Sending test SMS...' : 'Send test SMS'}
        </Button>
      </GuidedFlowActions>
    </div>
  );
}
