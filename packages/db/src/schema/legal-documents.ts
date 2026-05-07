import {
  boolean,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';

export const legalDocuments = pgTable(
  'legal_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentType: text('document_type').notNull(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    publicVisible: boolean('public_visible').notNull().default(true),
    acceptanceRequired: boolean('acceptance_required').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('legal_documents_document_type_idx').on(table.documentType),
    uniqueIndex('legal_documents_slug_idx').on(table.slug),
  ],
);
