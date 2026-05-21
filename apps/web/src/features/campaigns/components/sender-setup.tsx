"use client";

import { useMemo, useState } from 'react';
import type { PublicOrganizationSmsSender } from '@retaino/shared/contracts';
import { Phone } from 'lucide-react';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectItem } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { textStyles } from '@/lib/text-styles';
import { useProvisionSmsSender } from '../hooks/use-provision-sms-sender';
import { useSmsSenderCountries } from '../hooks/use-sms-sender-countries';
import { useSmsSenderNumbers } from '../hooks/use-sms-sender-numbers';
import {
  SenderCountryCombobox,
  SenderSelect,
} from './sender-setup-controls';

export function SenderSetup({
  organizationId,
  sender,
}: {
  organizationId: string | null;
  sender: PublicOrganizationSmsSender | null;
}) {
  const senderReady = sender?.status === 'ready';
  const setupOrganizationId = !senderReady ? organizationId : null;
  const countries = useSmsSenderCountries(setupOrganizationId);
  const [countryCode, setCountryCode] = useState('');
  const effectiveCountryCode =
    countryCode ||
    sender?.countryCode ||
    countries.data?.countries[0]?.countryCode ||
    '';
  const numbers = useSmsSenderNumbers({
    countryCode: effectiveCountryCode,
    organizationId: setupOrganizationId,
  });
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState('');
  const senderPhoneNumberIsAvailable = Boolean(
    sender?.phoneNumber &&
      numbers.data?.numbers.some(
        (number) => number.phoneNumber === sender.phoneNumber,
      ),
  );
  const effectiveSelectedPhoneNumber =
    selectedPhoneNumber &&
    numbers.data?.numbers.some(
      (number) => number.phoneNumber === selectedPhoneNumber,
    )
      ? selectedPhoneNumber
      : senderPhoneNumberIsAvailable
        ? (sender?.phoneNumber ?? '')
      : numbers.data?.numbers[0]?.phoneNumber ?? '';
  const selectedSender = useMemo(
    () =>
      numbers.data?.numbers.find(
        (number) => number.phoneNumber === effectiveSelectedPhoneNumber,
      ) ?? null,
    [effectiveSelectedPhoneNumber, numbers.data?.numbers],
  );
  const provisionSender = useProvisionSmsSender(setupOrganizationId);

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h3 className={textStyles.itemTitle}>Sender</h3>
            <p className={textStyles.mutedBody}>
              {sender?.phoneNumber
                ? sender.phoneNumber
                : 'Choose the number recipients will see.'}
            </p>
          </div>
          <StatusBadge
            label={senderReady ? 'Ready' : senderStatusLabel(sender?.status)}
            tone={senderReady ? 'green' : 'amber'}
          />
        </div>

        {sender?.failureReason ? (
          <ItemNotice
            description={sender.failureReason}
            title="Sender setup needs attention"
            tone="destructive"
          />
        ) : null}
      </section>

      {!senderReady ? (
        <section className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="campaign-sender-country">Country</Label>
              <SenderCountryCombobox
                countries={countries.data?.countries ?? []}
                disabled={countries.isLoading}
                id="campaign-sender-country"
                onChange={(value) => {
                  setCountryCode(value);
                  setSelectedPhoneNumber('');
                }}
                value={effectiveCountryCode}
              />
            </div>

            <SenderSelect
              disabled={numbers.isLoading || !numbers.data?.numbers.length}
              id="campaign-sender-number"
              label="Number"
              onValueChange={setSelectedPhoneNumber}
              placeholder={numbers.isLoading ? 'Loading...' : 'Choose number'}
              value={effectiveSelectedPhoneNumber}
            >
              {(numbers.data?.numbers ?? []).map((number) => (
                <SelectItem key={number.phoneNumber} value={number.phoneNumber}>
                  {number.label}
                </SelectItem>
              ))}
            </SenderSelect>
          </div>

          {numbers.isError || countries.isError || provisionSender.isError ? (
            <ItemNotice
              description={setupErrorMessage(
                numbers.error ?? countries.error ?? provisionSender.error,
              )}
              title="Sender setup failed"
              tone="destructive"
            />
          ) : null}

          <div className="flex justify-end">
            <Button
              disabled={
                !selectedSender ||
                provisionSender.isPending
              }
              onClick={() => {
                if (!selectedSender) {
                  return;
                }

                provisionSender.mutate({ selectedSender });
              }}
              type="button"
            >
              {provisionSender.isPending ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <Phone aria-hidden="true" data-icon="inline-start" />
              )}
              {provisionSender.isPending ? 'Setting up sender...' : 'Set up sender'}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function senderStatusLabel(
  status: PublicOrganizationSmsSender['status'] | undefined,
) {
  if (status === 'pending') {
    return 'Pending';
  }

  if (status === 'manual_action_required') {
    return 'Needs action';
  }

  if (status === 'failed') {
    return 'Failed';
  }

  return 'Not set up';
}

function setupErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Try choosing another sender number.';
}
