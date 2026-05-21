"use client";

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  PublicOrganizationSmsSender,
  SmsSenderCountriesResponse,
} from '@retaino/shared/contracts';
import { Check, ChevronsUpDown, Phone } from 'lucide-react';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';
import { useProvisionSmsSender } from '../hooks/use-provision-sms-sender';
import { useSmsSenderCountries } from '../hooks/use-sms-sender-countries';
import { useSmsSenderNumbers } from '../hooks/use-sms-sender-numbers';

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

type SenderCountry = SmsSenderCountriesResponse['countries'][number];

function SenderCountryCombobox({
  countries,
  disabled,
  id,
  onChange,
  value,
}: {
  countries: SenderCountry[];
  disabled?: boolean;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected =
    countries.find((country) => country.countryCode === value)?.label ??
    'Choose country';
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? countries.filter((country) =>
        [country.countryCode, country.label].some((candidate) =>
          candidate.toLowerCase().includes(normalizedQuery),
        ),
      )
    : countries;

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          setQuery('');
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="h-8 w-full justify-between"
          disabled={disabled}
          id={id}
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className="truncate">{selected}</span>
          <ChevronsUpDown aria-hidden="true" data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2">
        <Input
          aria-label="Search sender countries"
          autoComplete="off"
          className="mb-2"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search country"
          value={query}
        />
        <div className="max-h-64 overflow-y-auto" role="listbox">
          {filtered.length > 0 ? (
            filtered.map((country) => (
              <button
                aria-selected={country.countryCode === value}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                  country.countryCode === value && 'bg-accent/60',
                )}
                key={country.countryCode}
                onClick={() => {
                  onChange(country.countryCode);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                <span className="min-w-0 flex-1 truncate">{country.label}</span>
                <span className="shrink-0 text-muted-foreground">
                  {country.countryCode}
                </span>
                <Check
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0',
                    country.countryCode === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            ))
          ) : (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No countries found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
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

function setupErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Try choosing another sender number.';
}
