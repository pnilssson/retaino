import { and, asc, eq, inArray, isNull, lt, or } from 'drizzle-orm';
import {
  dateOnlyToUtcDate,
  parseMajorCurrencyAmount,
  type CreateReportedBookingsInput,
} from '@retaino/shared';
import type { CampaignReport } from '@retaino/shared/contracts';
import { auditEvents } from '../audit-events';
import type { DbClient } from '../client';
import {
  campaignRecipients,
  campaigns,
  contacts,
  organizationProfiles,
  reportedBookings,
} from '../schema';
import { recordAuditLog } from './audit-logs';
import { assertOrganizationId } from './contacts';

type ReportedBookingResult =
  CampaignReport['reportedBookings'][number];

type CreateReportedBookingsResult =
  | {
      status: 'created';
      reportedBookings: ReportedBookingResult[];
    }
  | { status: 'not_found' }
  | { status: 'not_reportable' }
  | { status: 'invalid_recipient'; rowIndex: number }
  | { status: 'invalid_revenue'; rowIndex: number; error: string };

type ReportedBookingContactUpdate = {
  contactId: string;
  bookingDate: string;
};

export async function createReportedBookings(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string;
    actorUserId: string;
    input: CreateReportedBookingsInput;
    now?: Date;
    userAgent?: string | null;
  },
): Promise<CreateReportedBookingsResult> {
  assertOrganizationId(input.organizationId);
  const now = input.now ?? new Date();

  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.organizationId, input.organizationId),
          eq(campaigns.id, input.campaignId),
        ),
      )
      .limit(1);

    if (!campaign) {
      return { status: 'not_found' };
    }

    if (campaign.status !== 'sent' && campaign.status !== 'failed') {
      return { status: 'not_reportable' };
    }

    const campaignRecipientIds = input.input.bookings.map(
      (booking) => booking.campaignRecipientId,
    );
    const recipientRows = await tx
      .select({
        id: campaignRecipients.id,
        campaignId: campaignRecipients.campaignId,
        contactId: campaignRecipients.contactId,
        name: campaignRecipients.name,
        phone: campaignRecipients.phone,
        email: campaignRecipients.email,
      })
      .from(campaignRecipients)
      .where(
        and(
          eq(campaignRecipients.organizationId, input.organizationId),
          eq(campaignRecipients.campaignId, input.campaignId),
          inArray(campaignRecipients.id, campaignRecipientIds),
        ),
      );
    const recipientsById = new Map(
      recipientRows.map((recipient) => [recipient.id, recipient]),
    );

    const [existingCurrency] = await tx
      .select({ currency: reportedBookings.currency })
      .from(reportedBookings)
      .where(
        and(
          eq(reportedBookings.organizationId, input.organizationId),
          eq(reportedBookings.campaignId, input.campaignId),
        ),
      )
      .orderBy(asc(reportedBookings.createdAt))
      .limit(1);
    let currency = existingCurrency?.currency;

    if (!currency) {
      const [profile] = await tx
        .select({ currency: organizationProfiles.currency })
        .from(organizationProfiles)
        .where(eq(organizationProfiles.organizationId, input.organizationId))
        .limit(1);

      currency = profile?.currency ?? 'SEK';
    }

    const preparedRows = [];

    for (const [index, booking] of input.input.bookings.entries()) {
      const recipient = recipientsById.get(booking.campaignRecipientId);

      if (!recipient || recipient.contactId !== booking.contactId) {
        return { status: 'invalid_recipient', rowIndex: index };
      }

      const parsedRevenue = booking.revenueAmount
        ? parseMajorCurrencyAmount(booking.revenueAmount, currency)
        : { ok: true as const, value: null };

      if (!parsedRevenue.ok) {
        return {
          status: 'invalid_revenue',
          rowIndex: index,
          error: parsedRevenue.error,
        };
      }

      preparedRows.push({
        booking,
        recipient,
        revenueAmountMinor: parsedRevenue.value,
      });
    }

    const insertedBookings = await tx
      .insert(reportedBookings)
      .values(
        preparedRows.map(({ booking, revenueAmountMinor }) => ({
          organizationId: input.organizationId,
          campaignId: input.campaignId,
          campaignRecipientId: booking.campaignRecipientId,
          contactId: booking.contactId,
          source: 'manual',
          createdByUserId: input.actorUserId,
          bookingDate: booking.bookingDate,
          revenueAmountMinor,
          currency,
          service: booking.service ?? null,
          note: booking.note ?? null,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .returning();
    const revenueAmountMinor = preparedRows.reduce(
      (total, row) => total + (row.revenueAmountMinor ?? 0),
      0,
    );

    await advanceContactLastBookingDates(tx, {
      organizationId: input.organizationId,
      bookings: preparedRows.map(({ booking }) => ({
        contactId: booking.contactId,
        bookingDate: booking.bookingDate,
      })),
      updatedAt: now,
    });

    await recordAuditLog(
      tx,
      auditEvents.reportedBookingsCreated({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        campaignId: input.campaignId,
        bookingCount: preparedRows.length,
        currency,
        revenueAmountMinor,
        userAgent: input.userAgent ?? null,
      }),
    );

    return {
      status: 'created',
      reportedBookings: insertedBookings.map((booking) => {
        const recipient = recipientsById.get(booking.campaignRecipientId);

        return {
          id: booking.id,
          campaignId: booking.campaignId,
          campaignRecipientId: booking.campaignRecipientId,
          contactId: booking.contactId,
          source: 'manual',
          createdByUserId: booking.createdByUserId,
          bookingDate: booking.bookingDate,
          revenueAmountMinor: booking.revenueAmountMinor,
          currency: booking.currency,
          service: booking.service,
          note: booking.note,
          createdAt: booking.createdAt.toISOString(),
          contact: {
            id: booking.contactId,
            name: recipient?.name ?? null,
            phone: recipient?.phone ?? null,
            email: recipient?.email ?? null,
          },
        };
      }),
    };
  });
}

async function advanceContactLastBookingDates(
  db: Pick<DbClient, 'update'>,
  input: {
    organizationId: string;
    bookings: ReportedBookingContactUpdate[];
    updatedAt: Date;
  },
) {
  const latestBookingDatesByContactId = new Map<string, string>();

  for (const booking of input.bookings) {
    const latestBookingDate = latestBookingDatesByContactId.get(
      booking.contactId,
    );

    if (!latestBookingDate || booking.bookingDate > latestBookingDate) {
      latestBookingDatesByContactId.set(booking.contactId, booking.bookingDate);
    }
  }

  for (const [contactId, bookingDate] of latestBookingDatesByContactId) {
    const lastBookingAt = dateOnlyToUtcDate(bookingDate);

    await db
      .update(contacts)
      .set({
        lastBookingAt,
        updatedAt: input.updatedAt,
      })
      .where(
        and(
          eq(contacts.organizationId, input.organizationId),
          eq(contacts.id, contactId),
          or(
            isNull(contacts.lastBookingAt),
            lt(contacts.lastBookingAt, lastBookingAt),
          ),
        ),
      );
  }
}
