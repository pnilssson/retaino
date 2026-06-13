"use client";

import type {
  Campaign,
  CampaignRecipientSearchItem,
} from '@retaino/shared/contracts';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DatePickerInput } from '@/components/date-picker-input';
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@/components/searchable-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { textStyles } from '@/lib/text-styles';
import {
  fillReportedBookingContact,
  isValidBookingRevenueAmount,
  type ReportedBookingRowValues,
} from '../reported-booking-form';
import { useCampaignRecipientSearch } from '../hooks/use-campaign-recipient-search';

export function ReportedBookingRow({
  booking,
  campaign,
  currency,
  index,
  organizationId,
  onChange,
  onRemove,
  removable,
}: {
  booking: ReportedBookingRowValues;
  campaign: Campaign;
  currency: string;
  index: number;
  organizationId: string | null;
  onChange: (booking: ReportedBookingRowValues) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const t = useTranslations('Campaigns');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [isContactSelectOpen, setIsContactSelectOpen] = useState(false);
  const recipients = useCampaignRecipientSearch({
    campaignId: campaign.id,
    organizationId,
    search: recipientSearch,
  });
  const revenueError =
    booking.revenueAmount &&
    !isValidBookingRevenueAmount(booking.revenueAmount, currency)
      ? t('enterValidAmount')
      : null;

  return (
    <fieldset className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <legend className={textStyles.meta}>
          {t('bookingNumber', { number: index + 1 })}
        </legend>
        <Button
          aria-label={t('removeBookingNumber', { number: index + 1 })}
          disabled={!removable}
          onClick={onRemove}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" data-icon="inline-start" />
          {t('removeBooking')}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CampaignContactSelect
          id={`booking-${index}-contact`}
          isLoading={recipients.isFetching}
          onChange={setRecipientSearch}
          onOpenChange={(open) => {
            setIsContactSelectOpen(open);
            setRecipientSearch(open ? contactSearchText(booking) : '');
          }}
          onSelect={(recipient) => {
            onChange(fillReportedBookingContact(booking, recipient));
            setIsContactSelectOpen(false);
            setRecipientSearch('');
          }}
          open={isContactSelectOpen}
          recipients={recipients.data?.recipients ?? []}
          search={recipientSearch}
          selectedKey={booking.campaignRecipientId || null}
          value={contactDisplayValue(booking)}
        />
        <BookingRowInput
          id={`booking-${index}-date`}
          label={t('bookingDate')}
          onChange={(value) => onChange({ ...booking, bookingDate: value })}
          value={booking.bookingDate}
          variant="date"
        />
        <BookingRowInput
          error={revenueError}
          id={`booking-${index}-revenue`}
          label={t('revenue')}
          onChange={(value) => onChange({ ...booking, revenueAmount: value })}
          placeholder={currency}
          value={booking.revenueAmount}
        />
        <BookingRowInput
          id={`booking-${index}-service`}
          label={t('service')}
          onChange={(value) => onChange({ ...booking, service: value })}
          placeholder={t('servicePlaceholder')}
          value={booking.service}
        />
      </div>

      {booking.contactId ? (
        <p className={textStyles.meta}>
          {[booking.phone, booking.email].filter(Boolean).join(', ') ||
            t('noContactMethodsSaved')}
        </p>
      ) : null}

      <BookingRowTextarea
        id={`booking-${index}-note`}
        label={t('note')}
        onChange={(value) => onChange({ ...booking, note: value })}
        placeholder={t('notePlaceholder')}
        value={booking.note}
      />
    </fieldset>
  );
}

function CampaignContactSelect({
  id,
  isLoading,
  onChange,
  onOpenChange,
  onSelect,
  open,
  recipients,
  search,
  selectedKey,
  value,
}: {
  id: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (recipient: CampaignRecipientSearchItem) => void;
  open: boolean;
  recipients: CampaignRecipientSearchItem[];
  search: string;
  selectedKey: string | null;
  value: string;
}) {
  const t = useTranslations('Campaigns');
  const options: Array<SearchableComboboxOption<CampaignRecipientSearchItem>> =
    recipients.map((recipient) => ({
      description: [recipient.phone, recipient.email].filter(Boolean).join(', '),
      key: recipient.id,
      label:
        recipient.name ?? recipient.phone ?? recipient.email ?? t('unnamedContact'),
      searchText: [
        recipient.name,
        recipient.phone,
        recipient.email,
      ].filter(Boolean).join(' '),
      value: recipient,
    }));

  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{t('contact')}</Label>
      <SearchableCombobox
        clearQueryOnClose={false}
        displayValue={value || undefined}
        emptyText={t('noCampaignContactsFound')}
        id={id}
        isLoading={isLoading}
        loadingText={t('searchingContacts')}
        onOpenChange={onOpenChange}
        onQueryChange={onChange}
        onSelect={(option) => onSelect(option.value)}
        open={open}
        options={options}
        placeholder={t('searchCampaignContacts')}
        query={search}
        searchPlaceholder={t('searchCampaignContacts')}
        selectedKey={selectedKey}
      />
    </div>
  );
}

function BookingRowInput({
  error,
  id,
  label,
  onChange,
  placeholder,
  value,
  variant = 'text',
}: {
  error?: string | null;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
  variant?: 'date' | 'text';
}) {
  const t = useTranslations('Campaigns');
  const errorId = `${id}-error`;

  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      {variant === 'date' ? (
        <DatePickerInput
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          id={id}
          name={id}
          onChange={onChange}
          placeholder={t('selectDate')}
          value={value}
        />
      ) : (
        <Input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          id={id}
          name={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      )}
      {error ? (
        <p className={textStyles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function BookingRowTextarea({
  id,
  label,
  onChange,
  placeholder,
  value,
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        className="min-h-20"
        id={id}
        name={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </div>
  );
}

function contactDisplayValue(booking: ReportedBookingRowValues) {
  return booking.contactName || booking.phone || booking.email || '';
}

function contactSearchText(booking: ReportedBookingRowValues) {
  return [booking.contactName, booking.phone, booking.email]
    .filter(Boolean)
    .join(' ');
}
