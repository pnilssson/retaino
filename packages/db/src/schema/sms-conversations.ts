import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';
import { organizations } from './organizations';

export const smsConversations = pgTable(
  'sms_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    phoneHash: text('phone_hash').notNull(),
    normalizedPhone: text('normalized_phone').notNull(),
    unreadAt: timestamp('unread_at', { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('sms_conversations_organization_phone_hash_idx').on(
      table.organizationId,
      table.phoneHash,
    ),
  ],
);
