import { pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerk_user_id').notNull(),
    email: text('email'),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex('users_clerk_user_id_idx').on(table.clerkUserId)],
);
