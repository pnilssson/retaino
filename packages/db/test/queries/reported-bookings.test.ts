import { describe, expect, it, vi } from 'vitest';
import { createReportedBookings } from '../../src/queries/reported-bookings';
import { reportedBookings } from '../../src/schema/reported-bookings';
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
