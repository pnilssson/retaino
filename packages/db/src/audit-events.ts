import type {
  CampaignAudienceRule,
  CsvMapping,
  SuppressionType,
} from '@retaino/shared/contracts';
import type { ContactImportCounts } from './queries/contacts';
import type { AuditLogEvent, AuditLogMetadata } from './queries/audit-logs';

type BaseAuditEventInput = {
  organizationId: string;
  actorUserId: string;
  userAgent?: string | null;
};

export const auditEvents = {
  contactImportStarted(input: BaseAuditEventInput & {
    contactImportId: string;
    fileName: string;
    fileSize: number;
    mapping: CsvMapping;
    phoneCountryCode: string;
    permissionAttestedAt: Date;
  }): AuditLogEvent {
    return {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'contact_import.started',
      resourceType: 'contact_import',
      resourceId: input.contactImportId,
      metadata: {
        fileName: input.fileName,
        fileSize: input.fileSize,
        mapping: auditMapping(input.mapping),
        phoneCountryCode: input.phoneCountryCode,
        permissionAttestedAt: input.permissionAttestedAt.toISOString(),
      },
      userAgent: input.userAgent ?? null,
    };
  },

  contactImportCompleted(input: BaseAuditEventInput & {
    contactImportId: string;
    counts: ContactImportCounts;
  }): AuditLogEvent {
    return {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'contact_import.completed',
      resourceType: 'contact_import',
      resourceId: input.contactImportId,
      metadata: input.counts satisfies AuditLogMetadata,
      userAgent: input.userAgent ?? null,
    };
  },

  contactImportFailed(input: BaseAuditEventInput & {
    contactImportId: string;
    errorSummary: string[];
  }): AuditLogEvent {
    return {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'contact_import.failed',
      resourceType: 'contact_import',
      resourceId: input.contactImportId,
      metadata: { errorSummary: input.errorSummary },
      userAgent: input.userAgent ?? null,
    };
  },

  contactCreated(input: BaseAuditEventInput & {
    contactId: string;
    marketingSmsAllowed: boolean;
    suppressionCreated: boolean;
  }): AuditLogEvent {
    return {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'contact.created',
      resourceType: 'contact',
      resourceId: input.contactId,
      metadata: {
        marketingSmsAllowed: input.marketingSmsAllowed,
        suppressionCreated: input.suppressionCreated,
      },
      userAgent: input.userAgent ?? null,
    };
  },

  campaignReadyToSend(input: BaseAuditEventInput & {
    campaignId: string;
    audienceRule: CampaignAudienceRule;
    smsBody: string;
    bookingUrl: string;
    campaignCode: string | null;
    attributionWindowDays: number;
    recipientCount: number;
    recentCampaignExclusionAcknowledged: boolean;
  }): AuditLogEvent {
    return {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'campaign.ready_to_send',
      resourceType: 'campaign',
      resourceId: input.campaignId,
      metadata: {
        audienceRule: input.audienceRule,
        smsBody: input.smsBody,
        bookingUrl: input.bookingUrl,
        campaignCode: input.campaignCode,
        attributionWindowDays: input.attributionWindowDays,
        recipientCount: input.recipientCount,
        recentCampaignExclusionAcknowledged:
          input.recentCampaignExclusionAcknowledged,
      },
      userAgent: input.userAgent ?? null,
    };
  },

  contactSuppressionDeleted(input: BaseAuditEventInput & {
    contactId: string;
    suppressionId: string;
    type: SuppressionType;
    valueHash: string;
    reason: string;
    source: string | null;
    createdAt: Date;
  }): AuditLogEvent {
    return {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'contact_suppression.deleted',
      resourceType: 'contact',
      resourceId: input.contactId,
      metadata: {
        suppressionId: input.suppressionId,
        type: input.type,
        valueHash: input.valueHash,
        reason: input.reason,
        source: input.source,
        createdAt: input.createdAt.toISOString(),
      },
      userAgent: input.userAgent ?? null,
    };
  },

  contactsDeleted(input: BaseAuditEventInput & {
    mode: 'single' | 'bulk';
    requestedContactIds: string[];
    deletedContactIds: string[];
  }): AuditLogEvent {
    return {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'contacts.deleted',
      resourceType: 'organization',
      resourceId: input.organizationId,
      metadata: {
        mode: input.mode,
        requestedContactIds: input.requestedContactIds,
        deletedContactIds: input.deletedContactIds,
        deletedCount: input.deletedContactIds.length,
      },
      userAgent: input.userAgent ?? null,
    };
  },

  campaignSent(input: BaseAuditEventInput & {
    campaignId: string;
    recipientCount: number;
    sentCount: number;
    skippedCount: number;
    reservedCreditCount: number;
    actualCreditCount: number;
  }): AuditLogEvent {
    return {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'campaign.sent',
      resourceType: 'campaign',
      resourceId: input.campaignId,
      metadata: {
        recipientCount: input.recipientCount,
        sentCount: input.sentCount,
        skippedCount: input.skippedCount,
        reservedCreditCount: input.reservedCreditCount,
        actualCreditCount: input.actualCreditCount,
      },
      userAgent: input.userAgent ?? null,
    };
  },

  campaignFailed(input: BaseAuditEventInput & {
    campaignId: string;
    recipientCount: number;
    sentCount: number;
    skippedCount: number;
    reservedCreditCount: number;
    actualCreditCount: number;
    failureReason: string;
  }): AuditLogEvent {
    return {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'campaign.failed',
      resourceType: 'campaign',
      resourceId: input.campaignId,
      metadata: {
        recipientCount: input.recipientCount,
        sentCount: input.sentCount,
        skippedCount: input.skippedCount,
        reservedCreditCount: input.reservedCreditCount,
        actualCreditCount: input.actualCreditCount,
        failureReason: input.failureReason,
      },
      userAgent: input.userAgent ?? null,
    };
  },

  reportedBookingsCreated(input: BaseAuditEventInput & {
    campaignId: string;
    bookingCount: number;
    currency: string;
    revenueAmountMinor: number;
  }): AuditLogEvent {
    return {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      eventType: 'campaign.reported_bookings.created',
      resourceType: 'campaign',
      resourceId: input.campaignId,
      metadata: {
        bookingCount: input.bookingCount,
        currency: input.currency,
        revenueAmountMinor: input.revenueAmountMinor,
      },
      userAgent: input.userAgent ?? null,
    };
  },
};

function auditMapping(mapping: CsvMapping): AuditLogMetadata {
  return Object.fromEntries(
    Object.entries(mapping).filter((entry): entry is [string, string] =>
      typeof entry[1] === 'string',
    ),
  );
}
