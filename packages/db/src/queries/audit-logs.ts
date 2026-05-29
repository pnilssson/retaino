import type { DbClient } from '../client';
import { auditLogs } from '../schema';
import { assertOrganizationId } from './contacts';

type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0];

export type AuditLogDb = DbClient | DbTransaction;
export type AuditLogMetadataValue =
  | string
  | number
  | boolean
  | null
  | AuditLogMetadataValue[]
  | { [key: string]: AuditLogMetadataValue };
export type AuditLogMetadata = Record<string, AuditLogMetadataValue>;

export type AuditLogEvent = {
  organizationId: string;
  actorUserId: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  metadata: AuditLogMetadata;
  userAgent?: string | null;
};

export async function recordAuditLog(
  db: Pick<AuditLogDb, 'insert'>,
  input: AuditLogEvent,
) {
  assertOrganizationId(input.organizationId);

  await db
    .insert(auditLogs)
    .values({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
      userAgent: input.userAgent ?? null,
    })
    .returning();
}
