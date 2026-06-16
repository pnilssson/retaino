import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import {
  assertOrganizationId,
  contactIssueFilter,
  contactDetailToContract,
  contactSuppressionMethodFilter,
  contactStatusFilter,
  contactToContract,
  createContact,
  deleteProviderOptOutSuppressionByHash,
  deleteContacts,
  failContactImport,
  resolveImportedContactMatch,
  suppressContacts,
  upsertSuppressionByHash,
} from '../../src/queries/contacts';

const organizationId = '22222222-2222-4222-8222-222222222222';

describe('contact query helpers', () => {
  it('rejects tenant scoped calls without an organization id', () => {
    expect(() => assertOrganizationId('')).toThrow('organizationId is required');
  });

  it('computes contact status from facts and suppressions', () => {
    expect(
      contactToContract(
        {
          id: '11111111-1111-4111-8111-111111111111',
          organizationId: '22222222-2222-4222-8222-222222222222',
          name: 'Ada Lovelace',
          phone: '0701234567',
          email: 'ada@example.com',
          normalizedPhone: '+46701234567',
          normalizedEmail: 'ada@example.com',
          phoneHash: 'p',
          emailHash: 'e',
          lastBookingAt: null,
          lastContactedAt: null,
          consentStatus: 'granted',
          createdAt: new Date('2026-05-08T00:00:00.000Z'),
          updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        },
        { suppressed: false },
      ),
    ).toMatchObject({
      contactStatus: 'ready',
      contactIssues: [],
    });
  });

  it('maps contact details with suppressions', () => {
    expect(
      contactDetailToContract(
        {
          id: '11111111-1111-4111-8111-111111111111',
          organizationId: '22222222-2222-4222-8222-222222222222',
          name: 'Ada Lovelace',
          phone: '0701234567',
          email: 'ada@example.com',
          normalizedPhone: '+46701234567',
          normalizedEmail: 'ada@example.com',
          phoneHash: 'p',
          emailHash: 'e',
          lastBookingAt: null,
          lastContactedAt: null,
          consentStatus: 'granted',
          createdAt: new Date('2026-05-08T00:00:00.000Z'),
          updatedAt: new Date('2026-05-08T00:00:00.000Z'),
        },
        [
          {
            id: '33333333-3333-4333-8333-333333333333',
            organizationId: '22222222-2222-4222-8222-222222222222',
            type: 'phone',
            value: '0701234567',
            normalizedValue: '+46701234567',
            valueHash: 'p',
            reason: 'manual_contact_suppression',
            source: 'app',
            createdAt: new Date('2026-05-08T00:00:00.000Z'),
          },
        ],
      ),
    ).toMatchObject({
      contactStatus: 'blocked',
      contactIssues: ['suppressed_phone'],
      suppressions: [{ type: 'phone', reason: 'manual_contact_suppression' }],
    });
  });

  it('detects conflicting phone and email contact matches', () => {
    expect(
      resolveImportedContactMatch({
        phoneMatch: { id: '11111111-1111-4111-8111-111111111111' },
        emailMatch: { id: '22222222-2222-4222-8222-222222222222' },
      }),
    ).toEqual({ action: 'conflict' });
  });

  it('allows phone and email matches for the same contact', () => {
    const contact = { id: '11111111-1111-4111-8111-111111111111' };

    expect(
      resolveImportedContactMatch({
        phoneMatch: contact,
        emailMatch: contact,
      }),
    ).toEqual({ action: 'matched', contact });
  });

  it.each([
    [
      'status ready',
      () =>
        contactStatusFilter(
          '22222222-2222-4222-8222-222222222222',
          'ready',
        ),
      'not exists (',
    ],
    [
      'status blocked',
      () =>
        contactStatusFilter(
          '22222222-2222-4222-8222-222222222222',
          'blocked',
        ),
      'exists (',
    ],
    [
      'issue suppressed phone',
      () =>
        contactIssueFilter(
          '22222222-2222-4222-8222-222222222222',
          'suppressed_phone',
        ),
      'exists (',
    ],
  ] as const)(
    'builds valid suppression SQL for %s',
    (_name, buildCondition, expected) => {
      const condition = buildCondition();
      const query = new PgDialect().sqlToQuery(sql`select 1 where ${condition}`);

      expect(query.sql).toContain(expected);
      expect(query.sql).not.toContain('exists select');
      expect(query.sql).not.toContain('not exists select');
    },
  );

  it('does not build a suppression ownership filter without contact methods', () => {
    expect(
      contactSuppressionMethodFilter({ phoneHash: null, emailHash: null }),
    ).toBeUndefined();
  });

  it('builds suppression ownership filters from available contact methods', () => {
    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${contactSuppressionMethodFilter({
        phoneHash: 'phone-hash',
        emailHash: null,
      })}`,
    );

    expect(query.sql).toContain('"suppressions"."type" = $1');
    expect(query.sql).toContain('"suppressions"."value_hash" = $2');
    expect(query.params).toEqual(['phone', 'phone-hash']);
  });

  it('only fails imports that are still processing', async () => {
    let whereCondition: SQL | undefined;
    const tx = {
      update: () => ({
        set: () => ({
          where: (condition: SQL | undefined) => {
            whereCondition = condition;

            return {
              returning: () => [],
            };
          },
        }),
      }),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await failContactImport(db as never, {
      organizationId: '22222222-2222-4222-8222-222222222222',
      contactImportId: '44444444-4444-4444-8444-444444444444',
      error: 'stale event',
    });

    if (!whereCondition) {
      throw new Error('Expected failContactImport to build a where condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"contact_imports"."status" = $3');
    expect(query.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
      '44444444-4444-4444-8444-444444444444',
      'processing',
    ]);
  });

  it('bulk deletes only contacts owned by the organization', async () => {
    let whereCondition: SQL | undefined;
    const auditValues: unknown[] = [];
    const tx = {
      delete: () => ({
        where: (condition: SQL | undefined) => {
          whereCondition = condition;

          return {
            returning: () => [
              { id: '11111111-1111-4111-8111-111111111111' },
            ],
          };
        },
      }),
      insert: () => ({
        values: (values: unknown) => {
          auditValues.push(values);

          return {
            returning: () => [],
          };
        },
      }),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await deleteContacts(db as never, {
      organizationId: '22222222-2222-4222-8222-222222222222',
      contactIds: [
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
      ],
      actorUserId: '99999999-9999-4999-8999-999999999999',
    });

    if (!whereCondition) {
      throw new Error('Expected deleteContacts to build a where condition.');
    }

    const query = new PgDialect().sqlToQuery(
      sql`select 1 where ${whereCondition}`,
    );

    expect(query.sql).toContain('"contacts"."organization_id" = $1');
    expect(query.sql).toContain('"contacts"."id" in ($2, $3)');
    expect(query.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
      '33333333-3333-4333-8333-333333333333',
    ]);
    expect(auditValues).toEqual([
      expect.objectContaining({
        actorUserId: '99999999-9999-4999-8999-999999999999',
        eventType: 'contacts.deleted',
        resourceType: 'organization',
        metadata: expect.objectContaining({
          mode: 'bulk',
          deletedCount: 1,
          deletedContactIds: ['11111111-1111-4111-8111-111111111111'],
        }),
      }),
    ]);
  });

  it('creates a manually added contact with granted marketing permission', async () => {
    const auditValues: unknown[] = [];
    const now = new Date('2026-05-08T00:00:00.000Z');
    const createdRow = contactRow({
      consentStatus: 'granted',
      email: 'ada@example.com',
      normalizedEmail: 'ada@example.com',
      phone: '070 123 45 67',
      normalizedPhone: '+46701234567',
      now,
    });
    const tx = {
      select: () => ({
        from: () => ({
          where: () => selectionRows([]),
        }),
      }),
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          if ('eventType' in values) {
            auditValues.push(values);

            return { returning: () => [] };
          }

          expect(values).toMatchObject({
            organizationId,
            name: 'Ada Lovelace',
            phone: '070 123 45 67',
            email: 'ada@example.com',
            normalizedPhone: '+46701234567',
            normalizedEmail: 'ada@example.com',
            consentStatus: 'granted',
          });
          expect(values.phoneHash).toHaveLength(64);
          expect(values.emailHash).toHaveLength(64);

          return {
            onConflictDoNothing: () => ({
              returning: () => [createdRow],
            }),
          };
        },
      }),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await expect(
      createContact(db as never, {
        organizationId,
        actorUserId: '99999999-9999-4999-8999-999999999999',
        input: {
          name: 'Ada Lovelace',
          phone: '070 123 45 67',
          email: 'ada@example.com',
          phoneCountryCode: 'SE',
          lastBookingAt: null,
          marketingSmsAllowed: true,
        },
        userAgent: 'vitest',
      }),
    ).resolves.toMatchObject({
      status: 'created',
      contact: {
        consentStatus: 'granted',
        contactStatus: 'ready',
        suppressions: [],
      },
    });
    expect(auditValues).toEqual([
      expect.objectContaining({
        actorUserId: '99999999-9999-4999-8999-999999999999',
        eventType: 'contact.created',
        resourceType: 'contact',
        resourceId: createdRow.id,
        metadata: {
          marketingSmsAllowed: true,
          suppressionCreated: false,
        },
        userAgent: 'vitest',
      }),
    ]);
  });

  it('creates a manually added contact suppression when marketing is not allowed', async () => {
    const suppressionValues: unknown[] = [];
    const createdRow = contactRow({
      consentStatus: 'denied',
      phone: '070 123 45 67',
      normalizedPhone: '+46701234567',
    });
    const suppressionRow = {
      id: '77777777-7777-4777-8777-777777777777',
      organizationId,
      type: 'phone',
      value: '070 123 45 67',
      normalizedValue: '+46701234567',
      valueHash: 'phone-hash',
      reason: 'manual_contact_suppression',
      source: 'app',
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
    };
    let insertedContact = false;
    const tx = {
      select: () => ({
        from: () => ({
          where: () => selectionRows([]),
        }),
      }),
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          if ('eventType' in values) {
            return { returning: () => [] };
          }

          if (!insertedContact) {
            insertedContact = true;

            return {
              onConflictDoNothing: () => ({
                returning: () => [createdRow],
              }),
            };
          }

          suppressionValues.push(values);

          return {
            onConflictDoNothing: () => ({
              returning: () => [suppressionRow],
            }),
          };
        },
      }),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await expect(
      createContact(db as never, {
        organizationId,
        actorUserId: '99999999-9999-4999-8999-999999999999',
        input: {
          name: null,
          phone: '070 123 45 67',
          email: null,
          phoneCountryCode: 'SE',
          lastBookingAt: null,
          marketingSmsAllowed: false,
        },
      }),
    ).resolves.toMatchObject({
      status: 'created',
      contact: {
        consentStatus: 'denied',
        contactStatus: 'blocked',
        contactIssues: ['suppressed_phone', 'missing_consent'],
        suppressions: [
          {
            reason: 'manual_contact_suppression',
            source: 'app',
            type: 'phone',
          },
        ],
      },
    });
    expect(suppressionValues).toEqual([
      expect.objectContaining({
        organizationId,
        type: 'phone',
        value: '070 123 45 67',
        normalizedValue: '+46701234567',
        reason: 'manual_contact_suppression',
        source: 'app',
      }),
    ]);
  });

  it('rejects duplicate manual contact methods', async () => {
    const db = {
      transaction: async (callback: (inner: unknown) => unknown) =>
        callback({
          select: () => ({
            from: () => ({
              where: () =>
                selectionRows([
                  { id: '11111111-1111-4111-8111-111111111111' },
                ]),
            }),
          }),
        }),
    };

    await expect(
      createContact(db as never, {
        organizationId,
        actorUserId: '99999999-9999-4999-8999-999999999999',
        input: {
          name: 'Ada Lovelace',
          phone: '070 123 45 67',
          email: null,
          phoneCountryCode: 'SE',
          lastBookingAt: null,
          marketingSmsAllowed: true,
        },
      }),
    ).resolves.toEqual({ status: 'duplicate' });
  });

  it('returns duplicate when a manual contact insert loses a unique race', async () => {
    let auditInsertCalls = 0;
    const tx = {
      select: () => ({
        from: () => ({
          where: () => selectionRows([]),
        }),
      }),
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          if ('eventType' in values) {
            auditInsertCalls += 1;

            return { returning: () => [] };
          }

          return {
            onConflictDoNothing: () => ({
              returning: () => [],
            }),
          };
        },
      }),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await expect(
      createContact(db as never, {
        organizationId,
        actorUserId: '99999999-9999-4999-8999-999999999999',
        input: {
          name: null,
          phone: '070 123 45 67',
          email: null,
          phoneCountryCode: 'SE',
          lastBookingAt: null,
          marketingSmsAllowed: true,
        },
      }),
    ).resolves.toEqual({ status: 'duplicate' });
    expect(auditInsertCalls).toBe(0);
  });

  it('returns existing suppressions when a manually added contact is already blocked', async () => {
    const suppressionRow = {
      id: '77777777-7777-4777-8777-777777777777',
      organizationId,
      type: 'phone',
      value: '+46701234567',
      normalizedValue: '+46701234567',
      valueHash: 'phone-hash',
      reason: 'provider_opt_out',
      source: 'twilio',
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
    };
    let selectCalls = 0;
    const tx = {
      select: () => ({
        from: () => ({
          where: () => {
            selectCalls += 1;

            return selectCalls === 1
              ? selectionRows([])
              : selectionRows([suppressionRow]);
          },
        }),
      }),
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          if ('eventType' in values) {
            return { returning: () => [] };
          }

          return {
            onConflictDoNothing: () => ({
              returning: () => [
                contactRow({
                  consentStatus: 'granted',
                  phone: '070 123 45 67',
                  normalizedPhone: '+46701234567',
                }),
              ],
            }),
          };
        },
      }),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await expect(
      createContact(db as never, {
        organizationId,
        actorUserId: '99999999-9999-4999-8999-999999999999',
        input: {
          name: null,
          phone: '070 123 45 67',
          email: null,
          phoneCountryCode: 'SE',
          lastBookingAt: null,
          marketingSmsAllowed: true,
        },
      }),
    ).resolves.toMatchObject({
      status: 'created',
      contact: {
        consentStatus: 'granted',
        contactStatus: 'blocked',
        contactIssues: ['suppressed_phone'],
        suppressions: [{ reason: 'provider_opt_out', source: 'twilio' }],
      },
    });
  });

  it('does not audit a new suppression when the unchecked contact phone was already suppressed', async () => {
    const auditValues: unknown[] = [];
    const suppressionRow = {
      id: '77777777-7777-4777-8777-777777777777',
      organizationId,
      type: 'phone',
      value: '+46701234567',
      normalizedValue: '+46701234567',
      valueHash: 'phone-hash',
      reason: 'provider_opt_out',
      source: 'twilio',
      createdAt: new Date('2026-05-08T00:00:00.000Z'),
    };
    let insertedContact = false;
    let selectCalls = 0;
    const tx = {
      select: () => ({
        from: () => ({
          where: () => {
            selectCalls += 1;

            return selectCalls === 1
              ? selectionRows([])
              : selectionRows([suppressionRow]);
          },
        }),
      }),
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          if ('eventType' in values) {
            auditValues.push(values);

            return { returning: () => [] };
          }

          if (!insertedContact) {
            insertedContact = true;

            return {
              onConflictDoNothing: () => ({
                returning: () => [
                  contactRow({
                    consentStatus: 'denied',
                    phone: '070 123 45 67',
                    normalizedPhone: '+46701234567',
                  }),
                ],
              }),
            };
          }

          return {
            onConflictDoNothing: () => ({
              returning: () => [],
            }),
          };
        },
      }),
    };
    const db = {
      transaction: async (callback: (inner: typeof tx) => unknown) =>
        callback(tx),
    };

    await createContact(db as never, {
      organizationId,
      actorUserId: '99999999-9999-4999-8999-999999999999',
      input: {
        name: null,
        phone: '070 123 45 67',
        email: null,
        phoneCountryCode: 'SE',
        lastBookingAt: null,
        marketingSmsAllowed: false,
      },
    });

    expect(auditValues).toEqual([
      expect.objectContaining({
        metadata: {
          marketingSmsAllowed: false,
          suppressionCreated: false,
        },
      }),
    ]);
  });

  it('bulk suppresses usable phone contacts and ignores insert conflicts', async () => {
    let insertedValues: unknown[] = [];
    let conflictConfig: unknown;
    const db = {
      select: () => ({
        from: () => ({
          where: () => [
            {
              id: '11111111-1111-4111-8111-111111111111',
              phone: '0701234567',
              normalizedPhone: '+46701234567',
              phoneHash: 'phone-hash-1',
            },
            {
              id: '33333333-3333-4333-8333-333333333333',
              phone: null,
              normalizedPhone: null,
              phoneHash: null,
            },
          ],
        }),
      }),
      insert: () => ({
        values: (values: unknown[]) => {
          insertedValues = values;

          return {
            onConflictDoNothing: (config: unknown) => {
              conflictConfig = config;

              return {
                returning: () => [{ valueHash: 'phone-hash-1' }],
              };
            },
          };
        },
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: () => [],
          }),
        }),
      }),
    };

    const result = await suppressContacts(db as never, {
      organizationId: '22222222-2222-4222-8222-222222222222',
      contactIds: [
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
        '44444444-4444-4444-8444-444444444444',
      ],
      type: 'phone',
    });

    expect(insertedValues).toHaveLength(1);
    expect(insertedValues[0]).toMatchObject({
      organizationId: '22222222-2222-4222-8222-222222222222',
      type: 'phone',
      value: '0701234567',
      normalizedValue: '+46701234567',
      valueHash: 'phone-hash-1',
      reason: 'manual_contact_suppression',
      source: 'app',
    });
    expect(conflictConfig).toBeDefined();
    expect(result).toEqual({ affectedCount: 1, skippedCount: 2 });
  });

  it('upserts suppressions from provider opt-out replies', async () => {
    let insertedValue: unknown;
    let updateWhereCondition: SQL | undefined;
    const db = {
      insert: () => ({
        values: (value: unknown) => {
          insertedValue = value;

          return {
            onConflictDoNothing: () => ({
              returning: () => [
                {
                  id: '11111111-1111-4111-8111-111111111111',
                  type: 'phone',
                  value: '+46701111111',
                  normalizedValue: '+46701111111',
                  valueHash: 'phone-hash',
                  reason: 'provider_opt_out',
                  source: 'twilio',
                  createdAt: new Date('2026-05-16T10:03:00.000Z'),
                },
              ],
            }),
          };
        },
      }),
      update: () => ({
        set: () => ({
          where: (condition: SQL | undefined) => {
            updateWhereCondition = condition;
          },
        }),
      }),
    };

    await expect(
      upsertSuppressionByHash(db as never, {
        organizationId: '22222222-2222-4222-8222-222222222222',
        type: 'phone',
        value: '+46701111111',
        normalizedValue: '+46701111111',
        valueHash: 'phone-hash',
        reason: 'provider_opt_out',
        source: 'twilio',
      }),
    ).resolves.toEqual(expect.objectContaining({ reason: 'provider_opt_out' }));
    expect(insertedValue).toMatchObject({
      organizationId: '22222222-2222-4222-8222-222222222222',
      type: 'phone',
      valueHash: 'phone-hash',
      reason: 'provider_opt_out',
      source: 'twilio',
    });

    if (!updateWhereCondition) {
      throw new Error('Expected contact timestamp update condition.');
    }

    const updateQuery = new PgDialect().sqlToQuery(
      sql`update contacts set updated_at = now() where ${updateWhereCondition}`,
    );

    expect(updateQuery.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
      'phone-hash',
    ]);
  });

  it('does not touch contacts when provider opt-out suppression already exists', async () => {
    let updateCalls = 0;
    const db = {
      insert: () => ({
        values: () => ({
          onConflictDoNothing: () => ({
            returning: () => [],
          }),
        }),
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => [
              {
                id: '11111111-1111-4111-8111-111111111111',
                organizationId: '22222222-2222-4222-8222-222222222222',
                type: 'phone',
                value: '+46701111111',
                normalizedValue: '+46701111111',
                valueHash: 'phone-hash',
                reason: 'provider_opt_out',
                source: 'twilio',
                createdAt: new Date('2026-05-16T10:03:00.000Z'),
              },
            ],
          }),
        }),
      }),
      update: () => {
        updateCalls += 1;

        return {
          set: () => ({
            where: () => undefined,
          }),
        };
      },
    };

    await expect(
      upsertSuppressionByHash(db as never, {
        organizationId: '22222222-2222-4222-8222-222222222222',
        type: 'phone',
        value: '+46701111111',
        normalizedValue: '+46701111111',
        valueHash: 'phone-hash',
        reason: 'provider_opt_out',
        source: 'twilio',
      }),
    ).resolves.toEqual(expect.objectContaining({ reason: 'provider_opt_out' }));

    expect(updateCalls).toBe(0);
  });

  it('deletes provider opt-out suppressions by source and hash', async () => {
    let deleteWhereCondition: SQL | undefined;
    let updateWhereCondition: SQL | undefined;
    const db = {
      delete: () => ({
        where: (condition: SQL | undefined) => {
          deleteWhereCondition = condition;

          return {
            returning: () => [
              {
                id: '11111111-1111-4111-8111-111111111111',
                organizationId: '22222222-2222-4222-8222-222222222222',
                type: 'phone',
                value: '+46701111111',
                normalizedValue: '+46701111111',
                valueHash: 'phone-hash',
                reason: 'provider_opt_out',
                source: 'twilio',
                createdAt: new Date('2026-05-16T10:03:00.000Z'),
              },
            ],
          };
        },
      }),
      update: () => ({
        set: () => ({
          where: (condition: SQL | undefined) => {
            updateWhereCondition = condition;
          },
        }),
      }),
    };

    await expect(
      deleteProviderOptOutSuppressionByHash(db as never, {
        organizationId: '22222222-2222-4222-8222-222222222222',
        type: 'phone',
        valueHash: 'phone-hash',
        source: 'twilio',
      }),
    ).resolves.toEqual(expect.objectContaining({ source: 'twilio' }));

    if (!deleteWhereCondition) {
      throw new Error('Expected delete condition.');
    }

    const deleteQuery = new PgDialect().sqlToQuery(
      sql`delete from suppressions where ${deleteWhereCondition}`,
    );

    expect(deleteQuery.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
      'phone',
      'phone-hash',
      'provider_opt_out',
      'twilio',
    ]);

    if (!updateWhereCondition) {
      throw new Error('Expected contact timestamp update condition.');
    }

    const updateQuery = new PgDialect().sqlToQuery(
      sql`update contacts set updated_at = now() where ${updateWhereCondition}`,
    );

    expect(updateQuery.params).toEqual([
      '22222222-2222-4222-8222-222222222222',
      'phone-hash',
    ]);
  });

  it('does not touch contacts when provider opt-in finds no suppression', async () => {
    let updateCalls = 0;
    const db = {
      delete: () => ({
        where: () => ({
          returning: () => [],
        }),
      }),
      update: () => {
        updateCalls += 1;

        return {
          set: () => ({
            where: () => undefined,
          }),
        };
      },
    };

    await expect(
      deleteProviderOptOutSuppressionByHash(db as never, {
        organizationId: '22222222-2222-4222-8222-222222222222',
        type: 'phone',
        valueHash: 'phone-hash',
        source: 'twilio',
      }),
    ).resolves.toBeNull();

    expect(updateCalls).toBe(0);
  });
});

function contactRow(
  input: Partial<{
    consentStatus: string;
    email: string | null;
    normalizedEmail: string | null;
    normalizedPhone: string | null;
    now: Date;
    phone: string | null;
  }> = {},
) {
  const now = input.now ?? new Date('2026-05-08T00:00:00.000Z');

  return {
    id: '66666666-6666-4666-8666-666666666666',
    organizationId,
    name: 'Ada Lovelace',
    phone: input.phone ?? null,
    email: input.email ?? null,
    normalizedPhone: input.normalizedPhone ?? null,
    normalizedEmail: input.normalizedEmail ?? null,
    phoneHash: input.normalizedPhone ? 'phone-hash' : null,
    emailHash: input.normalizedEmail ? 'email-hash' : null,
    lastBookingAt: null,
    lastContactedAt: null,
    consentStatus: input.consentStatus ?? 'unknown',
    createdAt: now,
    updatedAt: now,
  };
}

function selectionRows<T>(rows: T[]) {
  return Object.assign(rows, { limit: () => rows });
}
