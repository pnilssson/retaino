import { bigint, date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { campaigns, campaignRecipients } from './campaigns';
import { contacts } from './contacts';
import { createdAt, updatedAt } from './common';
import { organizations } from './organizations';
import { users } from './users';

export const reportedBookings = pgTable(
  'reported_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    campaignRecipientId: uuid('campaign_recipient_id')
      .notNull()
      .references(() => campaignRecipients.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    source: text('source').notNull().default('manual'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    bookingDate: date('booking_date', { mode: 'string' }).notNull(),
    revenueAmountMinor: bigint('revenue_amount_minor', { mode: 'number' }),
    currency: text('currency').notNull(),
    service: text('service'),
    note: text('note'),
    createdAt,
    updatedAt,
  },
  (table) => [
    index('reported_bookings_organization_campaign_date_idx').on(
      table.organizationId,
      table.campaignId,
      table.bookingDate,
    ),
    index('reported_bookings_organization_contact_date_idx').on(
      table.organizationId,
      table.contactId,
      table.bookingDate,
    ),
    index('reported_bookings_organization_creator_idx').on(
      table.organizationId,
      table.createdByUserId,
    ),
  ],
);
