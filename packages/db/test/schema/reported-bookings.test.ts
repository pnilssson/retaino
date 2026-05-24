import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { reportedBookings } from '../../src/schema/reported-bookings';

describe('reported bookings schema', () => {
  it('stores direct reported booking rows for a campaign contact', () => {
    expect(reportedBookings.organizationId.name).toBe('organization_id');
    expect(reportedBookings.campaignId.name).toBe('campaign_id');
    expect(reportedBookings.campaignRecipientId.name).toBe(
      'campaign_recipient_id',
    );
    expect(reportedBookings.contactId.name).toBe('contact_id');
    expect(reportedBookings.source.name).toBe('source');
    expect('status' in reportedBookings).toBe(false);
    expect(reportedBookings.createdByUserId.name).toBe('created_by_user_id');
    expect(reportedBookings.bookingDate.name).toBe('booking_date');
    expect(reportedBookings.revenueAmountMinor.name).toBe(
      'revenue_amount_minor',
    );
    expect(reportedBookings.currency.name).toBe('currency');
    expect(reportedBookings.service.name).toBe('service');
    expect(reportedBookings.note.name).toBe('note');
  });

  it('does not duplicate contact fields', () => {
    expect('customerName' in reportedBookings).toBe(false);
    expect('phone' in reportedBookings).toBe(false);
    expect('email' in reportedBookings).toBe(false);
    expect('normalizedPhone' in reportedBookings).toBe(false);
    expect('normalizedEmail' in reportedBookings).toBe(false);
    expect('phoneHash' in reportedBookings).toBe(false);
    expect('emailHash' in reportedBookings).toBe(false);
  });

  it('indexes reported bookings for campaign and contact reads', () => {
    const indexes = getTableConfig(reportedBookings).indexes.map(
      (index) => index.config,
    );
    const campaignIndex = indexes.find(
      (index) =>
        index.name === 'reported_bookings_organization_campaign_date_idx',
    );
    const contactIndex = indexes.find(
      (index) =>
        index.name === 'reported_bookings_organization_contact_date_idx',
    );

    expect(campaignIndex?.columns.map((column) => column.name)).toEqual([
      'organization_id',
      'campaign_id',
      'booking_date',
    ]);
    expect(contactIndex?.columns.map((column) => column.name)).toEqual([
      'organization_id',
      'contact_id',
      'booking_date',
    ]);
  });
});
