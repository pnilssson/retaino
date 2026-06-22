"use client";

import { useState } from 'react';
import type { PublicOrganizationSmsSender } from '@retaino/shared/contracts';
import { Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { textStyles } from '@/lib/text-styles';
import { useProvisionSmsSender } from '../hooks/use-provision-sms-sender';
import { useSmsSenderCountries } from '../hooks/use-sms-sender-countries';
import { SenderCountryCombobox } from './sender-setup-controls';

export function SenderSetup({
  defaultCountryCode,
  organizationId,
  sender,
}: {
  defaultCountryCode: string;
  organizationId: string | null;
  sender: PublicOrganizationSmsSender | null;
}) {
  const t = useTranslations('Campaigns');
  const senderReady = sender?.status === 'ready';
  const setupOrganizationId = !senderReady ? organizationId : null;
  const countries = useSmsSenderCountries(setupOrganizationId);
  const [countryCode, setCountryCode] = useState('');
  const preferredCountryCode =
    countryCode || sender?.countryCode || defaultCountryCode;
  const countryOptions = countries.data?.countries ?? [];
  const effectiveCountryCode = countryOptions.some(
    (country) => country.countryCode === preferredCountryCode,
  )
    ? preferredCountryCode
    : countryOptions[0]?.countryCode ?? preferredCountryCode;
  const selectedCountry =
    countryOptions.find(
      (country) => country.countryCode === effectiveCountryCode,
    ) ?? null;
  const provisionSender = useProvisionSmsSender(setupOrganizationId);

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h3 className={textStyles.h3}>{t('sender')}</h3>
            <p className={textStyles.mutedP}>
              {sender?.phoneNumber
                ? sender.phoneNumber
                : t('chooseSenderNumberBase')}
            </p>
          </div>
          <StatusBadge
            label={senderReady ? t('senderReady') : senderStatusLabel(sender?.status, t)}
            tone={senderReady ? 'green' : 'amber'}
          />
        </div>

        {sender?.failureReason ? (
          <ItemNotice
            description={sender.failureReason}
            title={t('senderSetupNeedsAttentionTitle')}
            variant="error"
          />
        ) : null}
        {sender?.status === 'released' ? (
          <ItemNotice
            description={t('releasedSenderDescription')}
            title={t('setUpNewSenderTitle')}
            variant="warning"
          />
        ) : null}
      </section>

      {!senderReady ? (
        <section className="grid gap-5">
          <div className="grid gap-2 sm:max-w-sm">
            <Label htmlFor="campaign-sender-country">{t('country')}</Label>
            <SenderCountryCombobox
              countries={countryOptions}
              disabled={countries.isLoading}
              id="campaign-sender-country"
              onChange={setCountryCode}
              value={effectiveCountryCode}
            />
            <p className={textStyles.mutedP}>
              {t('senderCountryDescription')}
            </p>
          </div>

          {countries.isError || provisionSender.isError ? (
            <ItemNotice
              description={setupErrorMessage(
                countries.error ?? provisionSender.error,
                t,
            )}
            title={t('senderSetupFailedTitle')}
            variant="error"
          />
          ) : null}

          <div className="flex justify-end">
            <Button
              disabled={
                !selectedCountry ||
                provisionSender.isPending
              }
              onClick={() => {
                if (!selectedCountry) {
                  return;
                }

                provisionSender.mutate({
                  countryCode: selectedCountry.countryCode,
                });
              }}
              type="button"
            >
              {provisionSender.isPending ? (
                <Spinner aria-hidden="true" data-icon="inline-start" />
              ) : (
                <Phone aria-hidden="true" data-icon="inline-start" />
              )}
              {provisionSender.isPending ? t('settingUpSender') : t('setUpSender')}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function senderStatusLabel(
  status: PublicOrganizationSmsSender['status'] | undefined,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
) {
  if (status === 'pending') {
    return t('senderStatusPending');
  }

  if (status === 'manual_action_required') {
    return t('senderStatusNeedsAction');
  }

  if (status === 'failed') {
    return t('senderStatusFailed');
  }

  if (status === 'release_pending') {
    return t('senderStatusEnding');
  }

  if (status === 'released') {
    return t('senderStatusReleased');
  }

  if (status === 'release_failed') {
    return t('senderStatusNeedsAttention');
  }

  return t('senderStatusNotSetUp');
}

function setupErrorMessage(
  error: unknown,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
) {
  return error instanceof Error
    ? error.message
    : t('senderSetupFailedDescription');
}
