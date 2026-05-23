import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  bookingReports,
  reportedBookings,
} from '../../src/schema/booking-reports';

describe('booking reports schema', () => {
  it('stores manual booking report batches separately from campaign state', () => {
    expect(bookingReports.organizationId.name).toBe('organization_id');
    expect(bookingReports.campaignId.name).toBe('campaign_id');
    expect(bookingReports.source.name).toBe('source');
    expect(bookingReports.status.name).toBe('status');
    expect(bookingReports.checkedThroughDate.name).toBe('checked_through_date');
    expect(bookingReports.note.name).toBe('note');
    expect(bookingReports.createdByUserId.name).toBe('created_by_user_id');
  });

  it('stores reported booking rows under a booking report', () => {
    expect(reportedBookings.organizationId.name).toBe('organization_id');
    expect(reportedBookings.bookingReportId.name).toBe('booking_report_id');
    expect('campaignId' in reportedBookings).toBe(false);
    expect(reportedBookings.bookingDate.name).toBe('booking_date');
    expect(reportedBookings.customerName.name).toBe('customer_name');
    expect(reportedBookings.phone.name).toBe('phone');
    expect(reportedBookings.email.name).toBe('email');
    expect(reportedBookings.normalizedPhone.name).toBe('normalized_phone');
    expect(reportedBookings.normalizedEmail.name).toBe('normalized_email');
    expect(reportedBookings.phoneHash.name).toBe('phone_hash');
    expect(reportedBookings.emailHash.name).toBe('email_hash');
    expect(reportedBookings.revenueAmountMinor.name).toBe(
      'revenue_amount_minor',
    );
    expect(reportedBookings.currency.name).toBe('currency');
    expect(reportedBookings.service.name).toBe('service');
    expect(reportedBookings.note.name).toBe('note');
  });

  it('indexes reported bookings by report for outcome queries', () => {
    const indexes = getTableConfig(reportedBookings).indexes.map(
      (index) => index.config,
    );
    const reportIndex = indexes.find(
      (index) =>
        index.name === 'reported_bookings_organization_report_date_idx',
    );

    expect(reportIndex?.columns.map((column) => column.name)).toEqual([
      'organization_id',
      'booking_report_id',
      'booking_date',
    ]);
  });
});
