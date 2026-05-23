import { describe, expect, it, vi } from 'vitest';
import { createManualBookingReport } from '../../src/queries/booking-reports';
import {
  bookingReports,
  reportedBookings,
} from '../../src/schema/booking-reports';
import { auditLogs } from '../../src/schema/campaigns';
import { campaignRow } from './campaign-fixtures';

const sentCampaignRow = { ...campaignRow, status: 'sent' };

describe('booking report query helpers', () => {
  it('creates a manual booking report with separate reported booking rows', async () => {
    const now = new Date('2026-05-22T10:00:00.000Z');
    const insertedReports: unknown[] = [];
    const insertedBookings: unknown[] = [];
    const insertedAuditLogs: unknown[] = [];
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [sentCampaignRow],
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => [],
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [
                {
                  countryCode: 'SE',
                  currency: 'SEK',
                },
              ],
            }),
          }),
        }),
      insert: vi.fn((table: unknown) => ({
        values: (values: unknown) => {
          if (table === bookingReports) {
            insertedReports.push(values);

            return {
              returning: () => [
                {
                  ...(values as Record<string, unknown>),
                  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  createdAt: now,
                  updatedAt: now,
                },
              ],
            };
          }

          if (table === reportedBookings) {
            insertedBookings.push(...(values as unknown[]));

            return {
              returning: () => values,
            };
          }

          if (table === auditLogs) {
            insertedAuditLogs.push(values);
          }

          return {
            returning: () => [],
          };
        },
      })),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await expect(
      createManualBookingReport(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
        input: {
          checkedThroughDate: '2026-05-22',
          note: 'Checked booking system',
          bookings: [
            {
              bookingDate: '2026-05-21',
              customerName: 'Ada Lovelace',
              phone: '0700000000',
              email: 'ada@example.com',
              revenueAmount: '1250,50',
              service: 'Cut and color',
            },
          ],
        },
        now,
        userAgent: 'vitest',
      }),
    ).resolves.toMatchObject({
      status: 'created',
      report: {
        bookingCount: 1,
        revenueAmountMinor: 125050,
        currency: 'SEK',
        hasMixedCurrencies: false,
      },
    });

    expect(insertedReports).toEqual([
      expect.objectContaining({
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        source: 'manual',
        status: 'completed',
        checkedThroughDate: '2026-05-22',
        note: 'Checked booking system',
        createdByUserId: campaignRow.createdByUserId,
      }),
    ]);
    expect(insertedBookings).toEqual([
      expect.objectContaining({
        organizationId: campaignRow.organizationId,
        bookingReportId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        bookingDate: '2026-05-21',
        customerName: 'Ada Lovelace',
        phone: '0700000000',
        email: 'ada@example.com',
        normalizedPhone: '+46700000000',
        normalizedEmail: 'ada@example.com',
        revenueAmountMinor: 125050,
        currency: 'SEK',
        service: 'Cut and color',
      }),
    ]);
    expect(insertedAuditLogs).toEqual([
      expect.objectContaining({
        eventType: 'campaign.booking_report.created',
        resourceType: 'campaign',
        resourceId: campaignRow.id,
        userAgent: 'vitest',
        metadata: {
          bookingCount: 1,
          bookingReportId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          currency: 'SEK',
          revenueAmountMinor: 125050,
        },
      }),
    ]);
  });

  it('returns not_found when the campaign is outside the organization', async () => {
    const db = {
      transaction: async (callback: (inner: unknown) => unknown) =>
        callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => [],
              }),
            }),
          }),
        }),
    };

    await expect(
      createManualBookingReport(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
        input: {
          bookings: [
            {
              bookingDate: '2026-05-22',
              customerName: 'Ada',
            },
          ],
        },
      }),
    ).resolves.toEqual({ status: 'not_found' });
  });

  it('uses the existing campaign report currency for later reports', async () => {
    const now = new Date('2026-05-22T10:00:00.000Z');
    const insertedBookings: unknown[] = [];
    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [sentCampaignRow],
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => [{ currency: 'EUR' }],
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [
                {
                  countryCode: 'SE',
                  currency: 'SEK',
                },
              ],
            }),
          }),
        }),
      insert: vi.fn((table: unknown) => ({
        values: (values: unknown) => {
          if (table === bookingReports) {
            return {
              returning: () => [
                {
                  ...(values as Record<string, unknown>),
                  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  createdAt: now,
                  updatedAt: now,
                },
              ],
            };
          }

          if (table === reportedBookings) {
            insertedBookings.push(...(values as unknown[]));
          }

          return {
            returning: () => [],
          };
        },
      })),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await expect(
      createManualBookingReport(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
        input: {
          bookings: [
            {
              bookingDate: '2026-05-22',
              revenueAmount: '100',
            },
          ],
        },
      }),
    ).resolves.toMatchObject({
      status: 'created',
      report: {
        currency: 'EUR',
      },
    });
    expect(insertedBookings).toEqual([
      expect.objectContaining({
        currency: 'EUR',
        revenueAmountMinor: 10000,
      }),
    ]);
  });

  it('does not create booking reports before a campaign has sent', async () => {
    const insert = vi.fn();
    const db = {
      transaction: async (callback: (inner: unknown) => unknown) =>
        callback({
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => [campaignRow],
              }),
            }),
          }),
          insert,
        }),
    };

    await expect(
      createManualBookingReport(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
        input: {
          bookings: [
            {
              bookingDate: '2026-05-22',
              customerName: 'Ada',
            },
          ],
        },
      }),
    ).resolves.toEqual({ status: 'not_reportable' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('rejects invalid revenue before inserting rows', async () => {
    const insert = vi.fn();
    const db = {
      transaction: async (callback: (inner: unknown) => unknown) =>
        callback({
          select: vi
            .fn()
            .mockReturnValueOnce({
              from: () => ({
                where: () => ({
                  limit: () => [sentCampaignRow],
                }),
              }),
            })
            .mockReturnValueOnce({
              from: () => ({
                innerJoin: () => ({
                  where: () => ({
                    orderBy: () => ({
                      limit: () => [],
                    }),
                  }),
                }),
              }),
            })
            .mockReturnValueOnce({
              from: () => ({
                where: () => ({
                  limit: () => [
                    {
                      countryCode: 'SE',
                      currency: 'SEK',
                    },
                  ],
                }),
              }),
            }),
          insert,
        }),
    };

    await expect(
      createManualBookingReport(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
        input: {
          bookings: [
            {
              bookingDate: '2026-05-22',
              revenueAmount: '-1',
            },
          ],
        },
      }),
    ).resolves.toEqual({
      status: 'invalid_revenue',
      rowIndex: 0,
      error: 'Enter a positive amount.',
    });
    expect(insert).not.toHaveBeenCalled();
  });
});
