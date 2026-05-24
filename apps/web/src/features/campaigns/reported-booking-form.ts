import {
  MAX_REPORTED_BOOKING_ROWS,
  parseMajorCurrencyAmount,
} from '@retaino/shared';
import type {
  CampaignRecipientSearchItem,
  CreateReportedBookingsInput,
} from '@retaino/shared/contracts';

export type ReportedBookingFormValues = {
  bookings: ReportedBookingRowValues[];
};

export type ReportedBookingRowValues = {
  bookingDate: string;
  campaignRecipientId: string;
  contactId: string;
  contactName: string;
  phone: string;
  email: string;
  revenueAmount: string;
  service: string;
  note: string;
};

export function initialReportedBookingFormValues(): ReportedBookingFormValues {
  return {
    bookings: [emptyReportedBookingRow()],
  };
}

export function emptyReportedBookingRow(): ReportedBookingRowValues {
  return {
    bookingDate: '',
    campaignRecipientId: '',
    contactId: '',
    contactName: '',
    phone: '',
    email: '',
    revenueAmount: '',
    service: '',
    note: '',
  };
}

export function prepareReportedBookingsInput(
  value: ReportedBookingFormValues,
  currency: string,
): { ok: true; input: CreateReportedBookingsInput } | {
  ok: false;
  error: string;
} {
  const bookings = [];

  for (const [index, booking] of value.bookings.entries()) {
    const normalized = {
      bookingDate: booking.bookingDate,
      campaignRecipientId: booking.campaignRecipientId,
      contactId: booking.contactId,
      revenueAmount: booking.revenueAmount.trim() || undefined,
      service: booking.service.trim() || undefined,
      note: booking.note.trim() || undefined,
    };
    const hasAnyValue = Boolean(
      normalized.bookingDate ||
        normalized.campaignRecipientId ||
        normalized.revenueAmount ||
        normalized.service ||
        normalized.note,
    );

    if (!hasAnyValue) {
      continue;
    }

    if (!normalized.campaignRecipientId || !normalized.contactId) {
      return { ok: false, error: `Choose a contact on row ${index + 1}.` };
    }

    if (!normalized.bookingDate) {
      return { ok: false, error: `Add a booking date on row ${index + 1}.` };
    }

    if (
      normalized.revenueAmount &&
      !parseMajorCurrencyAmount(normalized.revenueAmount, currency).ok
    ) {
      return {
        ok: false,
        error: `Check the revenue amount on row ${index + 1}.`,
      };
    }

    bookings.push(normalized);
  }

  if (bookings.length === 0) {
    return { ok: false, error: 'Add at least one booking.' };
  }

  if (bookings.length > MAX_REPORTED_BOOKING_ROWS) {
    return {
      ok: false,
      error: `Save up to ${MAX_REPORTED_BOOKING_ROWS} bookings at a time.`,
    };
  }

  return {
    ok: true,
    input: {
      bookings,
    },
  };
}

export function isValidBookingRevenueAmount(value: string, currency: string) {
  return !value.trim() || parseMajorCurrencyAmount(value, currency).ok;
}

export function fillReportedBookingContact(
  booking: ReportedBookingRowValues,
  recipient: CampaignRecipientSearchItem,
): ReportedBookingRowValues {
  return {
    ...booking,
    campaignRecipientId: recipient.id,
    contactId: recipient.contactId,
    contactName: recipient.name ?? '',
    email: recipient.email ?? '',
    phone: recipient.phone ?? '',
  };
}
