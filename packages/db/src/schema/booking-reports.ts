import { bigint, date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { campaigns } from './campaigns';
import { createdAt, updatedAt } from './common';
import { organizations } from './organizations';
import { users } from './users';

export const bookingReports = pgTable(
  'booking_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    source: text('source').notNull().default('manual'),
    status: text('status').notNull().default('completed'),
    checkedThroughDate: date('checked_through_date', { mode: 'string' }),
    note: text('note'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('booking_reports_organization_campaign_created_idx').on(
      table.organizationId,
      table.campaignId,
      table.createdAt,
    ),
  ],
);

export const reportedBookings = pgTable(
  'reported_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    bookingReportId: uuid('booking_report_id')
      .notNull()
      .references(() => bookingReports.id, { onDelete: 'cascade' }),
    bookingDate: date('booking_date', { mode: 'string' }).notNull(),
    customerName: text('customer_name'),
    phone: text('phone'),
    email: text('email'),
    normalizedPhone: text('normalized_phone'),
    normalizedEmail: text('normalized_email'),
    phoneHash: text('phone_hash'),
    emailHash: text('email_hash'),
    revenueAmountMinor: bigint('revenue_amount_minor', { mode: 'number' }),
    currency: text('currency').notNull(),
    service: text('service'),
    note: text('note'),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('reported_bookings_organization_report_date_idx').on(
      table.organizationId,
      table.bookingReportId,
      table.bookingDate,
    ),
    index('reported_bookings_organization_phone_idx').on(
      table.organizationId,
      table.phoneHash,
    ),
    index('reported_bookings_organization_email_idx').on(
      table.organizationId,
      table.emailHash,
    ),
  ],
);
