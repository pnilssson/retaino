import { and, asc, eq } from 'drizzle-orm';
import {
  parseMajorCurrencyAmount,
  prepareContactMethods,
  type CreateManualBookingReportInput,
} from '@retaino/shared';
import type { DbClient } from '../client';
import {
  auditLogs,
  bookingReports,
  campaigns,
  organizationProfiles,
  reportedBookings,
} from '../schema';
import { assertOrganizationId } from './contacts';

type CreateManualBookingReportResult =
  | {
      status: 'created';
      report: {
        id: string;
        campaignId: string;
        source: 'manual';
        status: 'completed';
        checkedThroughDate: string | null;
        note: string | null;
        bookingCount: number;
        revenueAmountMinor: number;
        currency: string;
        hasMixedCurrencies: boolean;
        createdByUserId: string;
        createdAt: string;
      };
    }
  | { status: 'not_found' }
  | { status: 'not_reportable' }
  | { status: 'invalid_revenue'; rowIndex: number; error: string };

export async function createManualBookingReport(
  db: DbClient,
  input: {
    organizationId: string;
    campaignId: string;
    actorUserId: string;
    input: CreateManualBookingReportInput;
    now?: Date;
    userAgent?: string | null;
  },
): Promise<CreateManualBookingReportResult> {
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

    const [existingCurrency] = await tx
      .select({
        currency: reportedBookings.currency,
      })
      .from(reportedBookings)
      .innerJoin(
        bookingReports,
        and(
          eq(bookingReports.id, reportedBookings.bookingReportId),
          eq(bookingReports.organizationId, reportedBookings.organizationId),
        ),
      )
      .where(
        and(
          eq(bookingReports.organizationId, input.organizationId),
          eq(bookingReports.campaignId, input.campaignId),
        ),
      )
      .orderBy(asc(reportedBookings.createdAt))
      .limit(1);

    const [profile] = await tx
      .select({
        countryCode: organizationProfiles.countryCode,
        currency: organizationProfiles.currency,
      })
      .from(organizationProfiles)
      .where(eq(organizationProfiles.organizationId, input.organizationId))
      .limit(1);
    const currency =
      existingCurrency?.currency ?? profile?.currency ?? 'SEK';
    const phoneCountryCode = profile?.countryCode ?? 'SE';
    const preparedRows = [];

    for (const [index, booking] of input.input.bookings.entries()) {
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

      const contactMethods = await prepareContactMethods({
        email: booking.email,
        phone: booking.phone,
        phoneCountryCode,
      });

      preparedRows.push({
        booking,
        contactMethods,
        revenueAmountMinor: parsedRevenue.value,
      });
    }

    const revenueAmountMinor = preparedRows.reduce(
      (total, row) => total + (row.revenueAmountMinor ?? 0),
      0,
    );
    const [report] = await tx
      .insert(bookingReports)
      .values({
        organizationId: input.organizationId,
        campaignId: input.campaignId,
        source: 'manual',
        status: 'completed',
        checkedThroughDate: input.input.checkedThroughDate ?? null,
        note: input.input.note ?? null,
        createdByUserId: input.actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!report) {
      throw new Error('Failed to create booking report.');
    }

    await tx
      .insert(reportedBookings)
      .values(
        preparedRows.map(({ booking, contactMethods, revenueAmountMinor }) => ({
          organizationId: input.organizationId,
          bookingReportId: report.id,
          bookingDate: booking.bookingDate,
          customerName: booking.customerName ?? null,
          phone: booking.phone ?? null,
          email: booking.email ?? null,
          normalizedPhone: contactMethods.normalizedPhone,
          normalizedEmail: contactMethods.normalizedEmail,
          phoneHash: contactMethods.phoneHash,
          emailHash: contactMethods.emailHash,
          revenueAmountMinor,
          currency,
          service: booking.service ?? null,
          note: booking.note ?? null,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .returning();

    await tx
      .insert(auditLogs)
      .values({
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        eventType: 'campaign.booking_report.created',
        resourceType: 'campaign',
        resourceId: input.campaignId,
        metadata: {
          bookingCount: preparedRows.length,
          bookingReportId: report.id,
          currency,
          revenueAmountMinor,
        },
        userAgent: input.userAgent ?? null,
      })
      .returning();

    return {
      status: 'created',
      report: {
        id: report.id,
        campaignId: report.campaignId,
        source: 'manual',
        status: 'completed',
        checkedThroughDate: report.checkedThroughDate,
        note: report.note,
        bookingCount: preparedRows.length,
        revenueAmountMinor,
        currency,
        hasMixedCurrencies: false,
        createdByUserId: report.createdByUserId,
        createdAt: report.createdAt.toISOString(),
      },
    };
  });
}
