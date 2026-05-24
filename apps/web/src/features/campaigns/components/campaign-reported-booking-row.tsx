"use client";

import type {
  Campaign,
  CampaignRecipientSearchItem,
} from '@retaino/shared/contracts';
import { Trash2 } from 'lucide-react';
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
      ? 'Enter a valid amount.'
      : null;

  return (
    <fieldset className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <legend className={textStyles.metaStrong}>Booking {index + 1}</legend>
        <Button
          aria-label={`Remove booking ${index + 1}`}
          disabled={!removable}
          onClick={onRemove}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" data-icon="inline-start" />
          Remove booking
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
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
          label="Booking date"
          onChange={(value) => onChange({ ...booking, bookingDate: value })}
          value={booking.bookingDate}
          variant="date"
        />
        <BookingRowInput
          error={revenueError}
          id={`booking-${index}-revenue`}
          label="Revenue"
          onChange={(value) => onChange({ ...booking, revenueAmount: value })}
          placeholder={currency}
          value={booking.revenueAmount}
        />
      </div>

      {booking.contactId ? (
        <p className={textStyles.meta}>
          {[booking.phone, booking.email].filter(Boolean).join(', ') ||
            'No phone or email saved for this contact.'}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <BookingRowInput
          id={`booking-${index}-service`}
          label="Service"
          onChange={(value) => onChange({ ...booking, service: value })}
          placeholder="Service or treatment"
          value={booking.service}
        />
        <BookingRowTextarea
          id={`booking-${index}-note`}
          label="Note"
          onChange={(value) => onChange({ ...booking, note: value })}
          placeholder="Optional context"
          value={booking.note}
        />
      </div>
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
  const options: Array<SearchableComboboxOption<CampaignRecipientSearchItem>> =
    recipients.map((recipient) => ({
      description: [recipient.phone, recipient.email].filter(Boolean).join(', '),
      key: recipient.id,
      label:
        recipient.name ?? recipient.phone ?? recipient.email ?? 'Unnamed contact',
      searchText: [
        recipient.name,
        recipient.phone,
        recipient.email,
      ].filter(Boolean).join(' '),
      value: recipient,
    }));

  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>Contact</Label>
      <SearchableCombobox
        clearQueryOnClose={false}
        displayValue={value || undefined}
        emptyText="No campaign contacts found."
        id={id}
        isLoading={isLoading}
        loadingText="Searching contacts..."
        onOpenChange={onOpenChange}
        onQueryChange={onChange}
        onSelect={(option) => onSelect(option.value)}
        open={open}
        options={options}
        placeholder="Search campaign contacts"
        query={search}
        searchPlaceholder="Search campaign contacts"
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
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      {variant === 'date' ? (
        <DatePickerInput
          aria-invalid={Boolean(error)}
          id={id}
          onChange={onChange}
          placeholder="Select date"
          value={value}
        />
      ) : (
        <Input
          aria-invalid={Boolean(error)}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      )}
      {error ? <p className={textStyles.error}>{error}</p> : null}
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
