import {
  and,
  eq,
  sql,
} from 'drizzle-orm';
import type {
  InboxConversationActivityFilter,
  InboxConversationSummary,
  InboxMessage,
  SmsSenderProvider,
} from '@retaino/shared/contracts';
import type { DbClient } from '../client';
import {
  campaigns,
  contacts,
  smsConversations,
  smsMessages,
  suppressions,
} from '../schema';
import { assertOrganizationId } from './contacts';

type SmsMessageRow = typeof smsMessages.$inferSelect;

export async function upsertSmsConversationForMessage(
  db: DbClient,
  input: {
    organizationId: string;
    phoneHash: string;
    normalizedPhone: string;
    now?: Date;
  },
) {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const [row] = await db
    .insert(smsConversations)
    .values({
      organizationId: input.organizationId,
      phoneHash: input.phoneHash,
      normalizedPhone: input.normalizedPhone,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        smsConversations.organizationId,
        smsConversations.phoneHash,
      ],
      set: {
        normalizedPhone: input.normalizedPhone,
        updatedAt: now,
      },
    })
    .returning();

  return row ?? null;
}

export async function listInboxConversations(
  db: DbClient,
  input: {
    organizationId: string;
    activity: InboxConversationActivityFilter;
  },
): Promise<{ conversations: InboxConversationSummary[] }> {
  assertOrganizationId(input.organizationId);
  const rows = await conversationSummaryRows(db, {
    organizationId: input.organizationId,
    activity: input.activity,
  });

  return { conversations: rows.map(inboxConversationSummaryValue) };
}

export async function getInboxSummary(
  db: DbClient,
  input: { organizationId: string },
) {
  assertOrganizationId(input.organizationId);
  const result = await db.execute(sql`
    select count(distinct ${smsConversations.id})::integer
      as unread_conversation_count
    from ${smsConversations}
    inner join ${smsMessages}
      on ${smsMessages.organizationId} = ${smsConversations.organizationId}
      and ${smsMessages.phoneHash} = ${smsConversations.phoneHash}
      and ${smsMessages.direction} = ${'inbound'}
      and coalesce(
        ${smsMessages.receivedAt},
        ${smsMessages.sentAt},
        ${smsMessages.createdAt}
      ) > coalesce(
        ${smsConversations.lastReadAt},
        ${'1970-01-01'}::timestamptz
      )
    where ${smsConversations.organizationId} = ${input.organizationId}::uuid
  `);
  const [row = {}] = Array.from(result.rows ?? []) as Array<
    Record<string, unknown>
  >;

  return {
    unreadConversationCount: intValue(row.unread_conversation_count),
  };
}

export async function getInboxConversationById(
  db: DbClient,
  input: { organizationId: string; conversationId: string },
) {
  assertOrganizationId(input.organizationId);
  const rows = await conversationSummaryRows(db, {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    activity: 'all',
  });

  return rows[0] ? inboxConversationSummaryValue(rows[0]) : null;
}

export async function getInboxConversationPhoneIdentity(
  db: DbClient,
  input: { organizationId: string; conversationId: string },
) {
  assertOrganizationId(input.organizationId);
  const [row] = await db
    .select({
      phoneHash: smsConversations.phoneHash,
      normalizedPhone: smsConversations.normalizedPhone,
    })
    .from(smsConversations)
    .where(
      and(
        eq(smsConversations.organizationId, input.organizationId),
        eq(smsConversations.id, input.conversationId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listInboxMessages(
  db: DbClient,
  input: { organizationId: string; conversationId: string },
): Promise<{ messages: InboxMessage[] }> {
  assertOrganizationId(input.organizationId);
  const result = await db.execute(sql`
    select
      ${smsMessages.id} as id,
      ${smsConversations.id} as conversation_id,
      ${smsMessages.organizationId} as organization_id,
      ${smsMessages.direction} as direction,
      ${smsMessages.campaignId} as campaign_id,
      ${campaigns.name} as campaign_name,
      ${smsMessages.body} as body,
      ${smsMessages.status} as status,
      ${smsMessages.sentAt} as sent_at,
      ${smsMessages.receivedAt} as received_at,
      ${smsMessages.deliveredAt} as delivered_at,
      ${smsMessages.failedAt} as failed_at,
      ${smsMessages.createdAt} as created_at
    from ${smsMessages}
    inner join ${smsConversations}
      on ${smsConversations.organizationId} = ${smsMessages.organizationId}
      and ${smsConversations.phoneHash} = ${smsMessages.phoneHash}
    left join ${campaigns}
      on ${campaigns.organizationId} = ${smsMessages.organizationId}
      and ${campaigns.id} = ${smsMessages.campaignId}
    where ${smsMessages.organizationId} = ${input.organizationId}::uuid
      and ${smsConversations.id} = ${input.conversationId}::uuid
    order by
      coalesce(
        ${smsMessages.receivedAt},
        ${smsMessages.sentAt},
        ${smsMessages.createdAt}
      ) asc,
      ${smsMessages.createdAt} asc
  `);

  return {
    messages: Array.from(result.rows ?? []).map(inboxMessageValue),
  };
}

export async function markInboxConversationRead(
  db: DbClient,
  input: { organizationId: string; conversationId: string; now?: Date },
) {
  assertOrganizationId(input.organizationId);
  const latestResult = await db.execute(sql`
    select max(
      coalesce(
        ${smsMessages.receivedAt},
        ${smsMessages.sentAt},
        ${smsMessages.createdAt}
      )
    ) as latest_message_at
    from ${smsMessages}
    inner join ${smsConversations}
      on ${smsConversations.organizationId} = ${smsMessages.organizationId}
      and ${smsConversations.phoneHash} = ${smsMessages.phoneHash}
    where ${smsMessages.organizationId} = ${input.organizationId}::uuid
      and ${smsConversations.id} = ${input.conversationId}::uuid
  `);
  const [latestRow = {}] = Array.from(latestResult.rows ?? []) as Array<
    Record<string, unknown>
  >;
  const latestMessageAt = dateValue(latestRow.latest_message_at);

  if (!latestMessageAt) {
    return null;
  }

  await db
    .update(smsConversations)
    .set({
      lastReadAt: latestMessageAt,
      updatedAt: input.now ?? new Date(),
    })
    .where(
      and(
        eq(smsConversations.organizationId, input.organizationId),
        eq(smsConversations.id, input.conversationId),
      ),
    )
    .returning();

  return getInboxConversationById(db, input);
}

export async function createManualReplySmsMessage(
  db: DbClient,
  input: {
    conversationId: string;
    organizationId: string;
    contactId: string | null;
    createdByUserId: string;
    provider: SmsSenderProvider;
    fromPhone: string | null;
    toPhone: string;
    normalizedPhone: string;
    phoneHash: string;
    body: string;
    estimatedSegmentCount: number;
    currency: string | null;
    idempotencyKey: string;
    now?: Date;
  },
): Promise<{ status: 'created' | 'existing'; message: InboxMessage }> {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const [created] = await db
    .insert(smsMessages)
    .values({
      organizationId: input.organizationId,
      direction: 'outbound',
      campaignId: null,
      recipientId: null,
      contactId: input.contactId,
      createdByUserId: input.createdByUserId,
      provider: input.provider,
      fromPhone: input.fromPhone,
      toPhone: input.toPhone,
      normalizedPhone: input.normalizedPhone,
      phoneHash: input.phoneHash,
      idempotencyKey: input.idempotencyKey,
      body: input.body,
      status: 'queued',
      estimatedSegmentCount: input.estimatedSegmentCount,
      currency: input.currency,
      queuedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({
      target: [
        smsMessages.organizationId,
        smsMessages.idempotencyKey,
      ],
    })
    .returning();

  if (created) {
    await upsertSmsConversationForMessage(db, {
      organizationId: input.organizationId,
      phoneHash: input.phoneHash,
      normalizedPhone: input.normalizedPhone,
      now,
    });

    return {
      status: 'created',
      message: smsMessageRowToInboxMessage(created, input.conversationId),
    };
  }

  const [existing] = await db
    .select()
    .from(smsMessages)
    .where(
      and(
        eq(smsMessages.organizationId, input.organizationId),
        eq(smsMessages.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error('Manual SMS reply was not created or found.');
  }

  return {
    status: 'existing',
    message: smsMessageRowToInboxMessage(existing, input.conversationId),
  };
}

export async function markManualReplyFailed(
  db: DbClient,
  input: {
    organizationId: string;
    messageId: string;
    now?: Date;
  },
) {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();
  const [row] = await db
    .update(smsMessages)
    .set({
      status: 'failed',
      failedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(smsMessages.organizationId, input.organizationId),
        eq(smsMessages.id, input.messageId),
      ),
    )
    .returning();

  return row ?? null;
}

async function conversationSummaryRows(
  db: DbClient,
  input: {
    organizationId: string;
    activity: InboxConversationActivityFilter;
    conversationId?: string;
    phoneHash?: string;
  },
) {
  const conversationFilter = input.conversationId
    ? sql`and conversation_id = ${input.conversationId}::uuid`
    : sql``;
  const phoneFilter = input.phoneHash
    ? sql`and phone_hash = ${input.phoneHash}`
    : sql``;
  const activityFilter =
    input.activity === 'needs_reply'
      ? sql`
          and last_inbound_at is not null
          and (last_outbound_at is null or last_inbound_at > last_outbound_at)
          and reply_blocked = false
        `
      : sql``;
  const result = await db.execute(sql`
    with conversation_base as (
      select
        ${smsConversations.id} as conversation_id,
        ${smsConversations.organizationId} as organization_id,
        ${smsConversations.phoneHash} as phone_hash,
        ${smsConversations.normalizedPhone} as phone,
        ${smsConversations.lastReadAt} as last_read_at
      from ${smsConversations}
      where ${smsConversations.organizationId} = ${input.organizationId}::uuid
    ),
    latest_messages as (
      select distinct on (${smsMessages.organizationId}, ${smsMessages.phoneHash})
        ${smsMessages.organizationId} as organization_id,
        ${smsMessages.phoneHash} as phone_hash,
        ${smsMessages.direction} as latest_message_direction,
        ${smsMessages.body} as latest_message_body,
        coalesce(
          ${smsMessages.receivedAt},
          ${smsMessages.sentAt},
          ${smsMessages.createdAt}
        ) as latest_message_at,
        ${smsMessages.contactId} as contact_id,
        ${contacts.name} as contact_name,
        ${smsMessages.campaignId} as latest_campaign_id,
        ${campaigns.name} as latest_campaign_name
      from ${smsMessages}
      left join ${contacts}
        on ${contacts.organizationId} = ${smsMessages.organizationId}
        and ${contacts.id} = ${smsMessages.contactId}
      left join ${campaigns}
        on ${campaigns.organizationId} = ${smsMessages.organizationId}
        and ${campaigns.id} = ${smsMessages.campaignId}
      where ${smsMessages.organizationId} = ${input.organizationId}::uuid
        and ${smsMessages.phoneHash} is not null
      order by
        ${smsMessages.organizationId},
        ${smsMessages.phoneHash},
        coalesce(
          ${smsMessages.receivedAt},
          ${smsMessages.sentAt},
          ${smsMessages.createdAt}
        ) desc,
        ${smsMessages.createdAt} desc
    ),
    message_rollups as (
      select
        ${smsMessages.organizationId} as organization_id,
        ${smsMessages.phoneHash} as phone_hash,
        max(coalesce(
          ${smsMessages.receivedAt},
          ${smsMessages.sentAt},
          ${smsMessages.createdAt}
        )) filter (where ${smsMessages.direction} = ${'inbound'})
          as last_inbound_at,
        max(coalesce(
          ${smsMessages.receivedAt},
          ${smsMessages.sentAt},
          ${smsMessages.createdAt}
        )) filter (where ${smsMessages.direction} = ${'outbound'})
          as last_outbound_at
      from ${smsMessages}
      where ${smsMessages.organizationId} = ${input.organizationId}::uuid
        and ${smsMessages.phoneHash} is not null
      group by ${smsMessages.organizationId}, ${smsMessages.phoneHash}
    ),
    unread_counts as (
      select
        conversation_base.organization_id,
        conversation_base.phone_hash,
        count(${smsMessages.id})::integer as unread_count
      from conversation_base
      left join ${smsMessages}
        on ${smsMessages.organizationId} = conversation_base.organization_id
        and ${smsMessages.phoneHash} = conversation_base.phone_hash
        and ${smsMessages.direction} = ${'inbound'}
        and coalesce(
          ${smsMessages.receivedAt},
          ${smsMessages.sentAt},
          ${smsMessages.createdAt}
        ) > coalesce(conversation_base.last_read_at, ${'1970-01-01'}::timestamptz)
      group by conversation_base.organization_id, conversation_base.phone_hash
    ),
    summaries as (
      select
        conversation_base.conversation_id,
        conversation_base.organization_id,
        conversation_base.phone_hash,
        conversation_base.phone,
        latest_messages.contact_id,
        latest_messages.contact_name,
        latest_messages.latest_campaign_id,
        latest_messages.latest_campaign_name,
        latest_messages.latest_message_direction,
        latest_messages.latest_message_body,
        latest_messages.latest_message_at,
        coalesce(unread_counts.unread_count, 0)::integer as unread_count,
        (latest_suppression.id is not null) as reply_blocked,
        case
          when latest_suppression.id is not null then ${'suppressed_phone'}
          else null
        end as reply_blocked_reason,
        message_rollups.last_inbound_at,
        message_rollups.last_outbound_at
      from conversation_base
      inner join latest_messages
        on latest_messages.organization_id = conversation_base.organization_id
        and latest_messages.phone_hash = conversation_base.phone_hash
      inner join message_rollups
        on message_rollups.organization_id = conversation_base.organization_id
        and message_rollups.phone_hash = conversation_base.phone_hash
      left join unread_counts
        on unread_counts.organization_id = conversation_base.organization_id
        and unread_counts.phone_hash = conversation_base.phone_hash
      left join ${suppressions} latest_suppression
        on latest_suppression.organization_id = conversation_base.organization_id
        and latest_suppression.type = ${'phone'}
        and latest_suppression.value_hash = conversation_base.phone_hash
    )
    select *
    from summaries
    where true
      ${conversationFilter}
      ${phoneFilter}
      ${activityFilter}
    order by latest_message_at desc
  `);

  return Array.from(result.rows ?? []) as Array<Record<string, unknown>>;
}

function inboxConversationSummaryValue(
  row: Record<string, unknown>,
): InboxConversationSummary {
  return {
    id: stringValue(row.conversation_id) ?? '',
    organizationId: stringValue(row.organization_id) ?? '',
    phone: stringValue(row.phone) ?? '',
    contactId: stringValue(row.contact_id),
    contactName: stringValue(row.contact_name),
    latestCampaignId: stringValue(row.latest_campaign_id),
    latestCampaignName: stringValue(row.latest_campaign_name),
    latestMessageDirection:
      stringValue(row.latest_message_direction) === 'outbound'
        ? 'outbound'
        : 'inbound',
    latestMessageBody: stringValue(row.latest_message_body) ?? '',
    latestMessageAt: isoValue(row.latest_message_at),
    unreadCount: intValue(row.unread_count),
    replyBlocked: row.reply_blocked === true,
    replyBlockedReason:
      stringValue(row.reply_blocked_reason) === 'suppressed_phone'
        ? 'suppressed_phone'
        : null,
  };
}

function inboxMessageValue(row: Record<string, unknown>): InboxMessage {
  return {
    id: stringValue(row.id) ?? '',
    conversationId: stringValue(row.conversation_id) ?? '',
    organizationId: stringValue(row.organization_id) ?? '',
    direction: stringValue(row.direction) === 'outbound' ? 'outbound' : 'inbound',
    campaignId: stringValue(row.campaign_id),
    campaignName: stringValue(row.campaign_name),
    body: stringValue(row.body) ?? '',
    status: stringValue(row.status) ?? 'queued',
    sentAt: nullableIsoValue(row.sent_at),
    receivedAt: nullableIsoValue(row.received_at),
    deliveredAt: nullableIsoValue(row.delivered_at),
    failedAt: nullableIsoValue(row.failed_at),
    createdAt: isoValue(row.created_at),
  };
}

function smsMessageRowToInboxMessage(
  row: SmsMessageRow,
  conversationId: string,
): InboxMessage {
  return {
    id: row.id,
    conversationId,
    organizationId: row.organizationId,
    direction: row.direction === 'outbound' ? 'outbound' : 'inbound',
    campaignId: row.campaignId,
    campaignName: null,
    body: row.body,
    status: row.status,
    sentAt: row.sentAt?.toISOString() ?? null,
    receivedAt: row.receivedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function intValue(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return 0;
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}

function dateValue(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' && value) {
    return new Date(value);
  }

  return null;
}

function isoValue(value: unknown) {
  return nullableIsoValue(value) ?? new Date(0).toISOString();
}

function nullableIsoValue(value: unknown) {
  const date = dateValue(value);

  return date ? date.toISOString() : null;
}
