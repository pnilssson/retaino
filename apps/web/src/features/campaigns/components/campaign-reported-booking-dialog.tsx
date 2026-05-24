"use client";

import { useForm } from '@tanstack/react-form';
import { MAX_REPORTED_BOOKING_ROWS } from '@retaino/shared';
import type { Campaign } from '@retaino/shared/contracts';
import { Plus } from 'lucide-react';
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
import {
  emptyReportedBookingRow,
  initialReportedBookingFormValues,
  prepareReportedBookingsInput,
  type ReportedBookingFormValues,
} from '../reported-booking-form';
import { useCreateReportedBookings } from '../hooks/use-create-reported-bookings';
import { ReportedBookingRow } from './campaign-reported-booking-row';

export function ReportedBookingDialog({
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
  const createReportedBookings = useCreateReportedBookings({
    campaignId: campaign.id,
    organizationId,
  });
  const form = useForm({
    defaultValues:
      initialReportedBookingFormValues() satisfies ReportedBookingFormValues,
    onSubmit: async ({ value }) => {
      const prepared = prepareReportedBookingsInput(value, currency);

      if (!prepared.ok) {
        setFormError(prepared.error);
        return;
      }

      setFormError(null);
      try {
        await createReportedBookings.mutateAsync(prepared.input);
      } catch {
        return;
      }

      toast.success('Reported bookings saved.');
      form.reset();
      setOpen(false);
    },
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus aria-hidden="true" data-icon="inline-start" />
          Add bookings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add bookings</DialogTitle>
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
          <form.Subscribe selector={(state) => state.values.bookings}>
            {(bookings) => (
              <div className="grid gap-5">
                {bookings.map((booking, index) => (
                  <ReportedBookingRow
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
                    disabled={bookings.length >= MAX_REPORTED_BOOKING_ROWS}
                    onClick={() =>
                      form.setFieldValue('bookings', [
                        ...bookings,
                        emptyReportedBookingRow(),
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

          {formError || createReportedBookings.isError ? (
            <ItemNotice
              description={
                formError ??
                (createReportedBookings.error instanceof Error
                  ? createReportedBookings.error.message
                  : 'Check the booking rows and try again.')
              }
              title="Bookings could not be saved"
              variant="error"
            />
          ) : null}

          <DialogFooter>
            <Button disabled={createReportedBookings.isPending} type="submit">
              {createReportedBookings.isPending
                ? 'Saving bookings...'
                : 'Save bookings'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
