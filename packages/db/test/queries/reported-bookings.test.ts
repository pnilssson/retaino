import { describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { sql, type SQL } from 'drizzle-orm';
import { createReportedBookings } from '../../src/queries/reported-bookings';
import { reportedBookings } from '../../src/schema/reported-bookings';
import { contacts } from '../../src/schema/contacts';
import { auditLogs } from '../../src/schema/campaigns';
import { campaignRow, recipientRow } from './campaign-fixtures';

const sentCampaignRow = { ...campaignRow, status: 'sent' };

describe('reported booking query helpers', () => {
  it('creates direct reported bookings for campaign recipients', async () => {
    const now = new Date('2026-05-22T10:00:00.000Z');
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
            where: () => [
              {
                id: recipientRow.id,
                campaignId: recipientRow.campaignId,
                contactId: recipientRow.contactId,
                name: recipientRow.name,
                phone: recipientRow.phone,
                email: recipientRow.email,
              },
            ],
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => [],
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [{ currency: 'SEK' }],
            }),
          }),
        }),
      insert: vi.fn((table: unknown) => ({
        values: (values: unknown) => {
          if (table === reportedBookings) {
            const rows = (values as Array<Record<string, unknown>>).map(
              (value, index) => ({
                ...value,
                id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(index).padStart(12, 'b')}`,
                createdAt: now,
                updatedAt: now,
              }),
            );
            insertedBookings.push(...rows);

            return {
              returning: () => rows,
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
      update: vi.fn(() => ({
        set: () => ({
          where: () => undefined,
        }),
      })),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await expect(
      createReportedBookings(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
        input: {
          bookings: [
            {
              bookingDate: '2026-05-21',
              campaignRecipientId: recipientRow.id,
              contactId: recipientRow.contactId,
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
      reportedBookings: [
        {
          bookingDate: '2026-05-21',
          campaignId: campaignRow.id,
          campaignRecipientId: recipientRow.id,
          contactId: recipientRow.contactId,
          revenueAmountMinor: 125050,
          currency: 'SEK',
          contact: {
            name: recipientRow.name,
            phone: recipientRow.phone,
            email: recipientRow.email,
          },
        },
      ],
    });

    expect(insertedBookings).toEqual([
      expect.objectContaining({
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        campaignRecipientId: recipientRow.id,
        contactId: recipientRow.contactId,
        source: 'manual',
        createdByUserId: campaignRow.createdByUserId,
        bookingDate: '2026-05-21',
        revenueAmountMinor: 125050,
        currency: 'SEK',
        service: 'Cut and color',
      }),
    ]);
    expect(insertedAuditLogs).toEqual([
      expect.objectContaining({
        eventType: 'campaign.reported_bookings.created',
        resourceType: 'campaign',
        resourceId: campaignRow.id,
        userAgent: 'vitest',
        metadata: {
          bookingCount: 1,
          currency: 'SEK',
          revenueAmountMinor: 125050,
        },
      }),
    ]);
  });

  it('advances contact latest booking dates from reported bookings', async () => {
    const now = new Date('2026-05-24T10:00:00.000Z');
    const contactUpdates: Array<{
      table: unknown;
      values: Record<string, unknown>;
      condition: SQL;
    }> = [];
    const secondRecipient = {
      ...recipientRow,
      id: '66666666-6666-4666-8666-666666666666',
    };
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
            where: () => [
              {
                id: recipientRow.id,
                campaignId: recipientRow.campaignId,
                contactId: recipientRow.contactId,
                name: recipientRow.name,
                phone: recipientRow.phone,
                email: recipientRow.email,
              },
              {
                id: secondRecipient.id,
                campaignId: secondRecipient.campaignId,
                contactId: secondRecipient.contactId,
                name: secondRecipient.name,
                phone: secondRecipient.phone,
                email: secondRecipient.email,
              },
            ],
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => [],
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [{ currency: 'SEK' }],
            }),
          }),
        }),
      insert: vi.fn((table: unknown) => ({
        values: (values: unknown) => {
          if (table === reportedBookings) {
            const rows = (values as Array<Record<string, unknown>>).map(
              (value, index) => ({
                ...value,
                id: `bbbbbbbb-bbbb-4bbb-8bbb-${String(index).padStart(12, 'b')}`,
                createdAt: now,
                updatedAt: now,
              }),
            );
            insertedBookings.push(...rows);

            return {
              returning: () => rows,
            };
          }

          return {
            returning: () => [],
          };
        },
      })),
      update: vi.fn((table: unknown) => ({
        set: (values: Record<string, unknown>) => ({
          where: (condition: SQL) => {
            contactUpdates.push({ table, values, condition });
          },
        }),
      })),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await createReportedBookings(db as never, {
      organizationId: campaignRow.organizationId,
      campaignId: campaignRow.id,
      actorUserId: campaignRow.createdByUserId,
      input: {
        bookings: [
          {
            bookingDate: '2026-05-21',
            campaignRecipientId: recipientRow.id,
            contactId: recipientRow.contactId,
          },
          {
            bookingDate: '2026-05-23',
            campaignRecipientId: secondRecipient.id,
            contactId: secondRecipient.contactId,
          },
        ],
      },
      now,
    });

    expect(insertedBookings).toHaveLength(2);
    expect(contactUpdates).toEqual([
      {
        table: contacts,
        values: {
          lastBookingAt: new Date('2026-05-23T00:00:00.000Z'),
          updatedAt: now,
        },
        condition: expect.anything(),
      },
    ]);

    const updateQuery = new PgDialect().sqlToQuery(
      sql`select 1 where ${contactUpdates[0]?.condition as SQL}`,
    );
    expect(updateQuery.sql).toContain('"contacts"."organization_id" =');
    expect(updateQuery.sql).toContain('"contacts"."id" =');
    expect(updateQuery.sql).toContain('"contacts"."last_booking_at" is null');
    expect(updateQuery.sql).toContain('"contacts"."last_booking_at" <');
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
      createReportedBookings(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
        input: {
          bookings: [
            {
              bookingDate: '2026-05-22',
              campaignRecipientId: recipientRow.id,
              contactId: recipientRow.contactId,
              service: 'Cut',
            },
          ],
        },
      }),
    ).resolves.toEqual({ status: 'not_found' });
  });

  it('rejects recipients that do not belong to the campaign', async () => {
    const insert = vi.fn();
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
            where: () => [],
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => [],
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({
              limit: () => [{ currency: 'SEK' }],
            }),
          }),
        }),
      insert,
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await expect(
      createReportedBookings(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
        input: {
          bookings: [
            {
              bookingDate: '2026-05-22',
              campaignRecipientId: recipientRow.id,
              contactId: recipientRow.contactId,
              service: 'Cut',
            },
          ],
        },
      }),
    ).resolves.toEqual({ status: 'invalid_recipient', rowIndex: 0 });
    expect(insert).not.toHaveBeenCalled();
  });

  it('does not create reported bookings before a campaign has sent', async () => {
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
      createReportedBookings(db as never, {
        organizationId: campaignRow.organizationId,
        campaignId: campaignRow.id,
        actorUserId: campaignRow.createdByUserId,
        input: {
          bookings: [
            {
              bookingDate: '2026-05-22',
              campaignRecipientId: recipientRow.id,
              contactId: recipientRow.contactId,
              service: 'Cut',
            },
          ],
        },
      }),
    ).resolves.toEqual({ status: 'not_reportable' });
    expect(insert).not.toHaveBeenCalled();
  });
});
