"use client";

import { useForm } from '@tanstack/react-form';
import { MAX_MANUAL_BOOKING_REPORT_ROWS } from '@retaino/shared';
import type { Campaign } from '@retaino/shared/contracts';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
            Add bookings you believe came from {campaign.name}.
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
                  <Label htmlFor={field.name}>Checked through</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    type="date"
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
                    placeholder="Checked campaign code, replies, or booking system"
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
                    currency={currency}
                    index={index}
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
                    Add row
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
  currency,
  index,
  onChange,
  onRemove,
  removable,
}: {
  booking: BookingReportRowValues;
  currency: string;
  index: number;
  onChange: (booking: BookingReportRowValues) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const revenueError =
    booking.revenueAmount &&
    !isValidBookingRevenueAmount(booking.revenueAmount, currency)
      ? 'Enter a valid amount.'
      : null;

  return (
    <fieldset className="grid gap-3 border-t border-border pt-3">
      <legend className={textStyles.metaStrong}>Booking {index + 1}</legend>
      <div className="grid gap-3 md:grid-cols-4">
        <BookingRowInput
          id={`booking-${index}-date`}
          label="Booking date"
          onChange={(value) => onChange({ ...booking, bookingDate: value })}
          type="date"
          value={booking.bookingDate}
        />
        <BookingRowInput
          id={`booking-${index}-customer`}
          label="Customer"
          onChange={(value) => onChange({ ...booking, customerName: value })}
          placeholder="Name"
          value={booking.customerName}
        />
        <BookingRowInput
          id={`booking-${index}-phone`}
          label="Phone"
          onChange={(value) => onChange({ ...booking, phone: value })}
          placeholder="+46..."
          type="tel"
          value={booking.phone}
        />
        <BookingRowInput
          id={`booking-${index}-email`}
          label="Email"
          onChange={(value) => onChange({ ...booking, email: value })}
          placeholder="name@example.com"
          type="email"
          value={booking.email}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-[10rem_1fr_2.5rem]">
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
        <div className="flex items-end">
          <Button
            aria-label={`Remove booking ${index + 1}`}
            disabled={!removable}
            onClick={onRemove}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
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

function BookingRowInput({
  error,
  id,
  label,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  error?: string | null;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        aria-invalid={Boolean(error)}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
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
