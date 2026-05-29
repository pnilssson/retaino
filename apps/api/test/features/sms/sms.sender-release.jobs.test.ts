import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
const setEnvVars = vi.fn(function setEnvVars(this: unknown) {
  return this;
});
const connectDb = vi.fn(async () => ({ db: 'db', close: vi.fn() }));
const captureBackgroundError = vi.fn();
const listOrganizationSmsSendersDueForRelease = vi.fn();
const processSmsSenderRelease = vi.fn();
const createFunction = vi.fn((config, handler) => {
  functionHandlers.set(config.id, handler);
  return {};
});
const functionHandlers = new Map<string, (input: unknown) => Promise<void>>();
const instances: Array<{
  options: unknown;
  send: typeof send;
  setEnvVars: typeof setEnvVars;
  createFunction: typeof createFunction;
}> = [];

vi.mock('@retaino/db', () => ({
  connectDb,
  listOrganizationSmsSendersDueForRelease,
}));

vi.mock('inngest', () => ({
  Inngest: vi.fn(function Inngest(options: unknown) {
    const instance = { options, send, setEnvVars, createFunction };
    instances.push(instance);
    return instance;
  }),
  Middleware: {
    BaseMiddleware: class BaseMiddleware {},
  },
}));

vi.mock('../../../src/features/sms/sms.sender-release', () => ({
  processSmsSenderRelease,
}));

vi.mock('../../../src/lib/sentry', () => ({
  captureBackgroundError,
}));

describe('SMS sender release jobs', () => {
  beforeEach(() => {
    vi.resetModules();
    send.mockReset();
    setEnvVars.mockClear();
    captureBackgroundError.mockReset();
    connectDb.mockClear();
    createFunction.mockClear();
    listOrganizationSmsSendersDueForRelease.mockReset();
    processSmsSenderRelease.mockReset();
    functionHandlers.clear();
    instances.length = 0;
  });

  it('sends sender release events with a deterministic id', async () => {
    const { enqueueSmsSenderReleaseProcessing } = await import(
      '../../../src/features/sms/sms.sender-release.jobs'
    );

    await enqueueSmsSenderReleaseProcessing(
      { INNGEST_EVENT_KEY: 'worker-event-key' },
      {
        organizationId: '22222222-2222-4222-8222-222222222222',
        sourceId: 'stripe-event:evt_123',
      },
    );

    expect(send).toHaveBeenCalledWith({
      id: 'sms-sender-release:22222222-2222-4222-8222-222222222222:stripe-event:evt_123',
      name: 'sms/sender.release',
      data: {
        organizationId: '22222222-2222-4222-8222-222222222222',
        sourceId: 'stripe-event:evt_123',
      },
    });
  });

  it('registers event and hourly sweep functions', async () => {
    await import('../../../src/features/sms/sms.sender-release.jobs');

    expect(createFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'process-sms-sender-release',
        singleton: {
          key: 'event.data.organizationId',
          mode: 'skip',
        },
        triggers: { event: 'sms/sender.release' },
      }),
      expect.any(Function),
    );
    expect(createFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sweep-sms-sender-releases',
        triggers: { cron: '0 * * * *' },
      }),
      expect.any(Function),
    );
  });

  it('processes sender release events with Worker bindings', async () => {
    await import('../../../src/features/sms/sms.sender-release.jobs');
    const step = {
      run: vi.fn(async (_name: string, callback: () => Promise<void>) =>
        callback(),
      ),
    };

    await functionHandlers.get('process-sms-sender-release')?.({
      event: {
        data: {
          organizationId: '22222222-2222-4222-8222-222222222222',
        },
      },
      step,
      env: {
        HYPERDRIVE: { connectionString: 'postgres://retaino.test/db' },
        SMS_SENDING_MODE: 'test',
      },
    });

    expect(connectDb).toHaveBeenCalledWith('postgres://retaino.test/db');
    expect(processSmsSenderRelease).toHaveBeenCalledWith({
      db: 'db',
      env: {
        HYPERDRIVE: { connectionString: 'postgres://retaino.test/db' },
        SMS_SENDING_MODE: 'test',
      },
      organizationId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('sweeps due sender releases hourly', async () => {
    await import('../../../src/features/sms/sms.sender-release.jobs');
    const step = {
      run: vi.fn(async (_name: string, callback: () => Promise<unknown>) =>
        callback(),
      ),
    };
    listOrganizationSmsSendersDueForRelease.mockResolvedValue([
      {
        organizationId: '22222222-2222-4222-8222-222222222222',
      },
      {
        organizationId: '33333333-3333-4333-8333-333333333333',
      },
    ]);

    await functionHandlers.get('sweep-sms-sender-releases')?.({
      step,
      env: {
        HYPERDRIVE: { connectionString: 'postgres://retaino.test/db' },
        SMS_SENDING_MODE: 'test',
      },
    });

    expect(listOrganizationSmsSendersDueForRelease).toHaveBeenCalledWith(
      'db',
      {
        now: expect.any(Date),
        limit: 100,
      },
    );
    expect(processSmsSenderRelease).toHaveBeenCalledTimes(2);
  });

  it('continues sweeping due sender releases after one release fails', async () => {
    const error = new Error('Twilio unavailable');
    await import('../../../src/features/sms/sms.sender-release.jobs');
    const step = {
      run: vi.fn(async (_name: string, callback: () => Promise<unknown>) =>
        callback(),
      ),
    };
    listOrganizationSmsSendersDueForRelease.mockResolvedValue([
      {
        organizationId: '22222222-2222-4222-8222-222222222222',
      },
      {
        organizationId: '33333333-3333-4333-8333-333333333333',
      },
    ]);
    processSmsSenderRelease
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ status: 'released' });

    await functionHandlers.get('sweep-sms-sender-releases')?.({
      step,
      env: {
        HYPERDRIVE: { connectionString: 'postgres://retaino.test/db' },
        SMS_SENDING_MODE: 'test',
      },
    });

    expect(processSmsSenderRelease).toHaveBeenCalledTimes(2);
    expect(captureBackgroundError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        feature: 'sms',
        operation: 'sweep_sender_release',
        organizationId: '22222222-2222-4222-8222-222222222222',
      }),
    );
  });
});
