import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
const createDb = vi.fn(() => 'db');
const processContactImport = vi.fn();
let functionHandler: ((input: unknown) => Promise<void>) | undefined;
const createFunction = vi.fn((_config, handler) => {
  functionHandler = handler;
  return {};
});
const instances: Array<{
  options: unknown;
  send: typeof send;
  createFunction: typeof createFunction;
}> = [];

vi.mock('@retaino/db', () => ({
  createDb,
}));

vi.mock('inngest', () => ({
  Inngest: vi.fn(function Inngest(options: unknown) {
    const instance = { options, send, createFunction };
    instances.push(instance);
    return instance;
  }),
  Middleware: {
    BaseMiddleware: class BaseMiddleware {},
  },
}));

vi.mock('../../../src/features/contacts/contacts.service', () => ({
  processContactImport,
}));

describe('contacts jobs', () => {
  beforeEach(() => {
    vi.resetModules();
    send.mockReset();
    createDb.mockClear();
    createFunction.mockClear();
    processContactImport.mockReset();
    functionHandler = undefined;
    instances.length = 0;
  });

  it('sends import process events with the Worker event key', async () => {
    const { enqueueContactImportProcessing } = await import(
      '../../../src/features/contacts/contacts.jobs'
    );

    await enqueueContactImportProcessing(
      { INNGEST_EVENT_KEY: 'worker-event-key' },
      {
        organizationId: '22222222-2222-4222-8222-222222222222',
        contactImportId: '44444444-4444-4444-8444-444444444444',
        userId: '11111111-1111-4111-8111-111111111111',
      },
    );

    expect(instances.at(-1)?.options).toMatchObject({
      id: 'retaino-api',
      eventKey: 'worker-event-key',
    });
    expect(send).toHaveBeenCalledWith({
      name: 'contacts/import.process',
      data: {
        organizationId: '22222222-2222-4222-8222-222222222222',
        contactImportId: '44444444-4444-4444-8444-444444444444',
        userId: '11111111-1111-4111-8111-111111111111',
      },
    });
  });

  it('processes imports directly with injected Worker bindings', async () => {
    await import('../../../src/features/contacts/contacts.jobs');
    const step = {
      run: vi.fn(async (_name: string, callback: () => Promise<void>) =>
        callback(),
      ),
    };
    const bucket = { get: vi.fn() };

    await functionHandler?.({
      event: {
        data: {
          organizationId: '22222222-2222-4222-8222-222222222222',
          contactImportId: '44444444-4444-4444-8444-444444444444',
          userId: '11111111-1111-4111-8111-111111111111',
        },
      },
      step,
      env: {
        DATABASE_URL: 'postgres://retaino.test/db',
        CONTACT_IMPORTS_BUCKET: bucket,
      },
    });

    expect(createDb).toHaveBeenCalledWith('postgres://retaino.test/db');
    expect(processContactImport).toHaveBeenCalledWith({
      db: 'db',
      bucket,
      organizationId: '22222222-2222-4222-8222-222222222222',
      contactImportId: '44444444-4444-4444-8444-444444444444',
    });
  });
});
