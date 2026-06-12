"use client";

import type { CampaignSmsTestContact } from '@retaino/shared/contracts';
import {
  useLocale,
  useTranslations,
} from 'next-intl';
import { useState } from 'react';
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@/components/searchable-combobox';
import { InfoTooltip } from '@/components/info-tooltip';
import { Label } from '@/components/ui/label';
import { getIntlLocale } from '@/lib/locale-format';
import { useCampaignTestSmsContacts } from '../hooks/use-campaign-test-sms-contacts';

export function CampaignTestSampleContactSelect({
  campaignId,
  disabled,
  onSelect,
  organizationId,
  value,
}: {
  campaignId: string | null;
  disabled: boolean;
  onSelect: (contact: CampaignSmsTestContact | null) => void;
  organizationId: string | null;
  value: CampaignSmsTestContact | null;
}) {
  const locale = useLocale();
  const t = useTranslations('Campaigns');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const contacts = useCampaignTestSmsContacts({
    campaignId,
    enabled: open,
    organizationId,
    search,
  });
  const options: Array<SearchableComboboxOption<CampaignSmsTestContact>> =
    (contacts.data?.contacts ?? []).map((candidate) => ({
      description: testSampleDescription(candidate, locale, t),
      key: candidate.id,
      label:
        candidate.name ??
        candidate.phone ??
        candidate.email ??
        t('unnamedContact'),
      searchText: [
        candidate.name,
        candidate.phone,
        candidate.email,
        candidate.lastBookingAt,
      ].filter(Boolean).join(' '),
      value: candidate,
    }));

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="campaign-test-sample-contact">
          {t('personalizeAs')}
        </Label>
        <InfoTooltip label={t('testPersonalizationDetails')}>
          {t('testPersonalizationDescription')}
        </InfoTooltip>
      </div>
      <SearchableCombobox
        clearQueryOnClose={false}
        disabled={disabled}
        displayValue={contactDisplayValue(value) || undefined}
        emptyText={t('noCampaignContactsFound')}
        id="campaign-test-sample-contact"
        isLoading={contacts.isFetching}
        loadingText={t('searchingContacts')}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          setSearch(isOpen ? sampleContactSearchText(value) : '');
        }}
        onQueryChange={setSearch}
        onSelect={(option) => {
          onSelect(option.value);
          setOpen(false);
          setSearch('');
        }}
        open={open}
        options={options}
        placeholder={t('searchCampaignContacts')}
        query={search}
        searchPlaceholder={t('searchCampaignContacts')}
        selectedKey={value?.id ?? null}
      />
    </div>
  );
}

function contactDisplayValue(contact: CampaignSmsTestContact | null) {
  return contact?.name ?? contact?.phone ?? contact?.email ?? '';
}

function sampleContactSearchText(contact: CampaignSmsTestContact | null) {
  return [contact?.name, contact?.phone, contact?.email]
    .filter(Boolean)
    .join(' ');
}

function testSampleDescription(
  contact: CampaignSmsTestContact,
  locale: string,
  t: ReturnType<typeof useTranslations<'Campaigns'>>,
) {
  return [
    contact.phone,
    contact.email,
    contact.lastBookingAt
      ? t('lastBookingDate', {
          date: formatTestSampleDate(contact.lastBookingAt, locale),
        })
      : null,
  ].filter(Boolean).join(', ');
}

function formatTestSampleDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: 'medium',
  }).format(new Date(value));
}
