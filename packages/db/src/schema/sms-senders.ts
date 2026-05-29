import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { organizations } from './organizations';

export const organizationSmsSenders = pgTable(
  'organization_sms_senders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    status: text('status').notNull().default('pending'),
    phoneNumber: text('phone_number'),
    countryCode: text('country_code'),
    numberType: text('number_type'),
    providerMessagingServiceId: text('provider_messaging_service_id'),
    providerPhoneNumberId: text('provider_phone_number_id'),
    regulatoryStatus: text('regulatory_status'),
    failureReason: text('failure_reason'),
    provisionedAt: timestamp('provisioned_at', { withTimezone: true }),
    lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
    releaseScheduledAt: timestamp('release_scheduled_at', {
      withTimezone: true,
    }),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('organization_sms_senders_organization_provider_idx').on(
      table.organizationId,
      table.provider,
    ),
    index('organization_sms_senders_organization_status_idx').on(
      table.organizationId,
      table.status,
    ),
    index('organization_sms_senders_provider_service_idx').on(
      table.provider,
      table.providerMessagingServiceId,
    ),
    index('organization_sms_senders_provider_phone_ref_idx').on(
      table.provider,
      table.providerPhoneNumberId,
    ),
    index('organization_sms_senders_provider_phone_idx').on(
      table.provider,
      table.phoneNumber,
    ),
  ],
);
