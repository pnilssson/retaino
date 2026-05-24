import {
  MAX_MANUAL_BOOKING_REPORT_ROWS,
  parseMajorCurrencyAmount,
} from '@retaino/shared';
import type { CreateManualBookingReportInput } from '@retaino/shared/contracts';

export type BookingReportFormValues = {
  checkedThroughDate: string;
  note: string;
  bookings: BookingReportRowValues[];
};

export type BookingReportRowValues = {
  bookingDate: string;
  customerName: string;
  phone: string;
  email: string;
  revenueAmount: string;
  service: string;
  note: string;
};

export function initialBookingReportFormValues(): BookingReportFormValues {
  return {
    checkedThroughDate: todayInputValue(),
    note: '',
    bookings: [emptyBookingRow()],
  };
}

export function emptyBookingRow(): BookingReportRowValues {
  return {
    bookingDate: '',
    customerName: '',
    phone: '',
    email: '',
    revenueAmount: '',
    service: '',
    note: '',
  };
}

export function prepareBookingReportInput(
  value: BookingReportFormValues,
  currency: string,
): { ok: true; input: CreateManualBookingReportInput } | {
  ok: false;
  error: string;
} {
  const bookings = [];

  for (const [index, booking] of value.bookings.entries()) {
    const normalized = {
      bookingDate: booking.bookingDate,
      customerName: booking.customerName.trim() || undefined,
      phone: booking.phone.trim() || undefined,
      email: booking.email.trim() || undefined,
      revenueAmount: booking.revenueAmount.trim() || undefined,
      service: booking.service.trim() || undefined,
      note: booking.note.trim() || undefined,
    };
    const hasAnyValue = Boolean(
      normalized.bookingDate ||
        normalized.customerName ||
        normalized.phone ||
        normalized.email ||
        normalized.revenueAmount ||
        normalized.service ||
        normalized.note,
    );

    if (!hasAnyValue) {
      continue;
    }

    if (!normalized.bookingDate) {
      return { ok: false, error: `Add a booking date on row ${index + 1}.` };
    }

    if (
      !normalized.customerName &&
      !normalized.phone &&
      !normalized.email &&
      !normalized.revenueAmount &&
      !normalized.service &&
      !normalized.note
    ) {
      return {
        ok: false,
        error: `Add booking details on row ${index + 1}.`,
      };
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

  if (bookings.length > MAX_MANUAL_BOOKING_REPORT_ROWS) {
    return {
      ok: false,
      error: `Save up to ${MAX_MANUAL_BOOKING_REPORT_ROWS} bookings at a time.`,
    };
  }

  return {
    ok: true,
    input: {
      checkedThroughDate: value.checkedThroughDate || undefined,
      note: value.note.trim() || undefined,
      bookings,
    },
  };
}

export function isValidBookingRevenueAmount(value: string, currency: string) {
  return !value.trim() || parseMajorCurrencyAmount(value, currency).ok;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}
