"use client";

import { useForm } from '@tanstack/react-form';
import { MAX_MANUAL_BOOKING_REPORT_ROWS } from '@retaino/shared';
import type {
  Campaign,
  CampaignRecipientSearchItem,
} from '@retaino/shared/contracts';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ItemNotice } from '@/components/item-notice';
import { InfoTooltip } from '@/components/info-tooltip';
import {
  SearchableCombobox,
  type SearchableComboboxOption,
} from '@/components/searchable-combobox';
import { Button } from '@/components/ui/button';
import { DatePickerInput } from '@/components/date-picker-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { textStyles } from '@/lib/text-styles';
import {
  emptyBookingRow,
  initialBookingReportFormValues,
  isValidBookingRevenueAmount,
  prepareBookingReportInput,
  type BookingReportFormValues,
  type BookingReportRowValues,
} from '../booking-report-form';
import { useCreateBookingReport } from '../hooks/use-create-booking-report';
import { useCampaignRecipientSearch } from '../hooks/use-campaign-recipient-search';

export function BookingReportDialog({
  campaign,
  currency,
  organizationId,
}: {
  campaign: Campaign;
  currency: string;
  organizationId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const createBookingReport = useCreateBookingReport({
    campaignId: campaign.id,
    organizationId,
  });
  const form = useForm({
    defaultValues:
      initialBookingReportFormValues() satisfies BookingReportFormValues,
    onSubmit: async ({ value }) => {
      const prepared = prepareBookingReportInput(value, currency);

      if (!prepared.ok) {
        setFormError(prepared.error);
        return;
      }

      setFormError(null);
      try {
        await createBookingReport.mutateAsync(prepared.input);
      } catch {
        return;
      }

      toast.success('Booking report saved.');
      form.reset();
      setOpen(false);
    },
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus aria-hidden="true" data-icon="inline-start" />
          New booking report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>New booking report</DialogTitle>
          <DialogDescription>
            Add booking outcomes from {campaign.name}.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <form.Field name="checkedThroughDate">
              {(field) => (
                <div className="grid gap-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor={field.name}>Checked until</Label>
                    <InfoTooltip label="Checked until details">
                      The report includes bookings checked up to this date.
                    </InfoTooltip>
                  </div>
                  <DatePickerInput
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="note">
              {(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Report note</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="Campaign code, replies, calls, or booking filter"
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(state) => state.values.bookings}>
            {(bookings) => (
              <div className="grid gap-3">
                {bookings.map((booking, index) => (
                  <BookingReportRow
                    booking={booking}
                    campaign={campaign}
                    currency={currency}
                    index={index}
                    organizationId={organizationId}
                    key={index}
                    onChange={(nextBooking) => {
                      const nextBookings = [...bookings];
                      nextBookings[index] = nextBooking;
                      form.setFieldValue('bookings', nextBookings);
                    }}
                    onRemove={() => {
                      form.setFieldValue(
                        'bookings',
                        bookings.filter((_, rowIndex) => rowIndex !== index),
                      );
                    }}
                    removable={bookings.length > 1}
                  />
                ))}
                <div>
                  <Button
                    disabled={bookings.length >= MAX_MANUAL_BOOKING_REPORT_ROWS}
                    onClick={() =>
                      form.setFieldValue('bookings', [
                        ...bookings,
                        emptyBookingRow(),
                      ])
                    }
                    type="button"
                    variant="outline"
                  >
                    <Plus aria-hidden="true" data-icon="inline-start" />
                    Add booking
                  </Button>
                </div>
              </div>
            )}
          </form.Subscribe>

          {formError || createBookingReport.isError ? (
            <ItemNotice
              description={
                formError ??
                (createBookingReport.error instanceof Error
                  ? createBookingReport.error.message
                  : 'Check the booking rows and try again.')
              }
              title="Booking report could not be saved"
              variant="error"
            />
          ) : null}

          <DialogFooter>
            <Button disabled={createBookingReport.isPending} type="submit">
              {createBookingReport.isPending
                ? 'Saving booking report...'
                : 'Save booking report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BookingReportRow({
  booking,
  campaign,
  currency,
  index,
  organizationId,
  onChange,
  onRemove,
  removable,
}: {
  booking: BookingReportRowValues;
  campaign: Campaign;
  currency: string;
  index: number;
  organizationId: string | null;
  onChange: (booking: BookingReportRowValues) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const [recipientSearch, setRecipientSearch] = useState('');
  const [activeRecipientField, setActiveRecipientField] = useState<
    'customerName' | 'email' | 'phone' | null
  >(null);
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
        <BookingRecipientInput
          active={activeRecipientField === 'customerName'}
          id={`booking-${index}-customer`}
          isLoading={recipients.isFetching}
          label="Customer"
          onChange={(value) => {
            setRecipientSearch(value);
            onChange({ ...booking, customerName: value });
          }}
          onOpenChange={(open) => {
            setActiveRecipientField(open ? 'customerName' : null);
            setRecipientSearch(open ? booking.customerName : '');
          }}
          onSelect={(recipient) => {
            onChange(fillBookingRecipient(booking, recipient));
            setActiveRecipientField(null);
            setRecipientSearch('');
          }}
          placeholder="Name"
          recipients={recipients.data?.recipients ?? []}
          search={recipientSearch}
          value={booking.customerName}
        />
        <BookingRecipientInput
          active={activeRecipientField === 'phone'}
          id={`booking-${index}-phone`}
          isLoading={recipients.isFetching}
          label="Phone"
          onChange={(value) => {
            setRecipientSearch(value);
            onChange({ ...booking, phone: value });
          }}
          onOpenChange={(open) => {
            setActiveRecipientField(open ? 'phone' : null);
            setRecipientSearch(open ? booking.phone : '');
          }}
          onSelect={(recipient) => {
            onChange(fillBookingRecipient(booking, recipient));
            setActiveRecipientField(null);
            setRecipientSearch('');
          }}
          placeholder="+46..."
          recipients={recipients.data?.recipients ?? []}
          search={recipientSearch}
          value={booking.phone}
        />
        <BookingRecipientInput
          active={activeRecipientField === 'email'}
          id={`booking-${index}-email`}
          isLoading={recipients.isFetching}
          label="Email"
          onChange={(value) => {
            setRecipientSearch(value);
            onChange({ ...booking, email: value });
          }}
          onOpenChange={(open) => {
            setActiveRecipientField(open ? 'email' : null);
            setRecipientSearch(open ? booking.email : '');
          }}
          onSelect={(recipient) => {
            onChange(fillBookingRecipient(booking, recipient));
            setActiveRecipientField(null);
            setRecipientSearch('');
          }}
          placeholder="name@example.com"
          recipients={recipients.data?.recipients ?? []}
          search={recipientSearch}
          value={booking.email}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,2fr)]">
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
        <BookingRowInput
          id={`booking-${index}-service`}
          label="Service"
          onChange={(value) => onChange({ ...booking, service: value })}
          placeholder="Service or treatment"
          value={booking.service}
        />
      </div>
      <BookingRowTextarea
        id={`booking-${index}-note`}
        label="Note"
        onChange={(value) => onChange({ ...booking, note: value })}
        placeholder="Optional context"
        value={booking.note}
      />
    </fieldset>
  );
}

function BookingRecipientInput({
  active,
  id,
  isLoading,
  label,
  onChange,
  onOpenChange,
  onSelect,
  placeholder,
  recipients,
  search,
  value,
}: {
  active: boolean;
  id: string;
  isLoading: boolean;
  label: string;
  onChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (recipient: CampaignRecipientSearchItem) => void;
  placeholder?: string;
  recipients: CampaignRecipientSearchItem[];
  search: string;
  value: string;
}) {
  const options: Array<SearchableComboboxOption<CampaignRecipientSearchItem>> =
    recipients.map((recipient) => ({
      description: [recipient.phone, recipient.email].filter(Boolean).join(', '),
      key: recipient.id,
      label: recipient.name ?? recipient.phone ?? recipient.email,
      searchText: [
        recipient.name,
        recipient.phone,
        recipient.email,
      ].filter(Boolean).join(' '),
      value: recipient,
    }));

  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id}>{label}</Label>
      <SearchableCombobox
        clearQueryOnClose={false}
        displayValue={value || undefined}
        emptyText="No campaign recipients found."
        id={id}
        isLoading={isLoading}
        loadingText="Searching recipients..."
        onOpenChange={onOpenChange}
        onQueryChange={onChange}
        onSelect={(option) => onSelect(option.value)}
        open={active}
        options={options}
        placeholder={placeholder ?? 'Search campaign recipients'}
        query={search}
        searchPlaceholder={placeholder ?? 'Search campaign recipients'}
      />
    </div>
  );
}

function fillBookingRecipient(
  booking: BookingReportRowValues,
  recipient: CampaignRecipientSearchItem,
): BookingReportRowValues {
  return {
    ...booking,
    customerName: recipient.name ?? booking.customerName,
    email: recipient.email ?? booking.email,
    phone: recipient.phone ?? booking.phone,
  };
}

function BookingRowInput({
  error,
  id,
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
  variant = 'text',
}: {
  error?: string | null;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
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
          type={type}
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
