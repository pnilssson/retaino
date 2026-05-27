"use client";

import type { CampaignSmsTestContact } from '@retaino/shared/contracts';
import { useState } from 'react';
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@/components/searchable-combobox';
import { InfoTooltip } from '@/components/info-tooltip';
import { Label } from '@/components/ui/label';
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
      description: testSampleDescription(candidate),
      key: candidate.id,
      label:
        candidate.name ??
        candidate.phone ??
        candidate.email ??
        'Unnamed contact',
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
        <Label htmlFor="campaign-test-sample-contact">Personalize as</Label>
        <InfoTooltip label="Test personalization details">
          Pick whose details should appear in the test SMS. The SMS still goes
          to the test phone below, or the responsible phone if blank.
        </InfoTooltip>
      </div>
      <SearchableCombobox
        clearQueryOnClose={false}
        disabled={disabled}
        displayValue={contactDisplayValue(value) || undefined}
        emptyText="No campaign contacts found."
        id="campaign-test-sample-contact"
        isLoading={contacts.isFetching}
        loadingText="Searching contacts..."
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
        placeholder="Search campaign contacts"
        query={search}
        searchPlaceholder="Search campaign contacts"
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

function testSampleDescription(contact: CampaignSmsTestContact) {
  return [
    contact.phone,
    contact.email,
    contact.lastBookingAt
      ? `Last booking ${formatTestSampleDate(contact.lastBookingAt)}`
      : null,
  ].filter(Boolean).join(', ');
}

function formatTestSampleDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}
