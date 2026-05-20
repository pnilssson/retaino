"use client";

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  PublicOrganizationSmsSender,
  SmsSenderNumberType,
} from '@retaino/shared/contracts';
import { Phone } from 'lucide-react';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { textStyles } from '@/lib/text-styles';
import { useProvisionSmsSender } from '../hooks/use-provision-sms-sender';
import { useSmsSenderCountries } from '../hooks/use-sms-sender-countries';
import { useSmsSenderNumbers } from '../hooks/use-sms-sender-numbers';

export function SenderSetup({
  canManageCampaigns,
  organizationId,
  sender,
}: {
  canManageCampaigns: boolean;
  organizationId: string | null;
  sender: PublicOrganizationSmsSender | null;
}) {
  const senderReady = sender?.status === 'ready';
  const setupOrganizationId =
    canManageCampaigns && !senderReady ? organizationId : null;
  const countries = useSmsSenderCountries(setupOrganizationId);
  const [countryCode, setCountryCode] = useState('');
  const effectiveCountryCode =
    countryCode ||
    sender?.countryCode ||
    countries.data?.countries[0]?.countryCode ||
    '';
  const selectedCountry = countries.data?.countries.find(
    (country) => country.countryCode === effectiveCountryCode,
  );
  const [numberType, setNumberType] = useState<SmsSenderNumberType | null>(null);
  const senderNumberType =
    sender?.numberType &&
    selectedCountry?.supportedNumberTypes.includes(sender.numberType)
      ? sender.numberType
      : null;
  const effectiveNumberType =
    numberType && selectedCountry?.supportedNumberTypes.includes(numberType)
      ? numberType
      : senderNumberType ?? selectedCountry?.supportedNumberTypes[0] ?? null;
  const numbers = useSmsSenderNumbers({
    countryCode: effectiveCountryCode,
    numberType: effectiveNumberType,
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

      {!senderReady && !canManageCampaigns ? (
        <ItemNotice
          description="An organization admin needs to set up the sender before campaign tests or sends can run."
          title="Sender setup needs admin access"
        />
      ) : null}

      {!senderReady && canManageCampaigns ? (
        <section className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <SenderSelect
              disabled={countries.isLoading}
              id="campaign-sender-country"
              label="Country"
              onValueChange={(value) => {
                setCountryCode(value);
                setSelectedPhoneNumber('');
              }}
              placeholder={countries.isLoading ? 'Loading…' : 'Choose country'}
              value={effectiveCountryCode}
            >
              {(countries.data?.countries ?? []).map((country) => (
                <SelectItem key={country.countryCode} value={country.countryCode}>
                  {country.label}
                </SelectItem>
              ))}
            </SenderSelect>

            <SenderSelect
              disabled={!selectedCountry}
              id="campaign-sender-number-type"
              label="Number type"
              onValueChange={(value) => {
                setNumberType(value as SmsSenderNumberType);
                setSelectedPhoneNumber('');
              }}
              placeholder="Choose type"
              value={effectiveNumberType ?? ''}
            >
              {(selectedCountry?.supportedNumberTypes ?? []).map((type) => (
                <SelectItem key={type} value={type}>
                  {numberTypeLabel(type)}
                </SelectItem>
              ))}
            </SenderSelect>

            <SenderSelect
              disabled={
                !effectiveNumberType ||
                numbers.isLoading ||
                !numbers.data?.numbers.length
              }
              id="campaign-sender-number"
              label="Number"
              onValueChange={setSelectedPhoneNumber}
              placeholder={numbers.isLoading ? 'Loading…' : 'Choose number'}
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
              {provisionSender.isPending ? 'Setting up sender…' : 'Set up sender'}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SenderSelect({
  children,
  disabled,
  id,
  label,
  onValueChange,
  placeholder,
  value,
}: {
  children: ReactNode;
  disabled: boolean;
  id: string;
  label: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        disabled={disabled}
        onValueChange={onValueChange}
        value={value || undefined}
      >
        <SelectTrigger aria-label={label} className="w-full" id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
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

function numberTypeLabel(type: SmsSenderNumberType) {
  if (type === 'toll_free') {
    return 'Toll-free';
  }

  return type === 'mobile' ? 'Mobile' : 'Local';
}

function setupErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Try choosing another sender number.';
}
