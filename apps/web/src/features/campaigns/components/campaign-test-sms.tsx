"use client";

import { useForm } from '@tanstack/react-form';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { GuidedFlowActions } from '@/components/guided-flow';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { textStyles } from '@/lib/text-styles';
import { useSendCampaignTestSms } from '../hooks/use-send-campaign-test-sms';

export function CampaignTestSms({
  campaignId,
  onBack,
  onSent,
  onSkip,
  senderReady,
}: {
  campaignId: string | null;
  onBack: () => void;
  onSent: () => void;
  onSkip: () => void;
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
      onSent();
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
            <p className={textStyles.mutedBody}>
              Leave empty to send to the responsible phone.
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
        <Button
          disabled={testSend.isPending}
          onClick={onSkip}
          type="button"
          variant="outline"
        >
          Skip
        </Button>
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
