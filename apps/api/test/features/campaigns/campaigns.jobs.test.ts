import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
const setEnvVars = vi.fn(function setEnvVars(this: unknown) {
  return this;
});
const createDb = vi.fn(() => 'db');
const processCampaignSend = vi.fn();
let functionHandler: ((input: unknown) => Promise<void>) | undefined;
const createFunction = vi.fn((_config, handler) => {
  functionHandler = handler;
  return {};
});
const instances: Array<{
  options: unknown;
  send: typeof send;
  setEnvVars: typeof setEnvVars;
  createFunction: typeof createFunction;
}> = [];

vi.mock('@retaino/db', () => ({
  createDb,
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

vi.mock('../../../src/features/campaigns/campaigns.service', () => ({
  processCampaignSend,
}));

describe('campaigns jobs', () => {
  beforeEach(() => {
    vi.resetModules();
    send.mockReset();
    setEnvVars.mockClear();
    createDb.mockClear();
    createFunction.mockClear();
    processCampaignSend.mockReset();
    functionHandler = undefined;
    instances.length = 0;
  });

  it('sends campaign process events with a deterministic id', async () => {
    const { enqueueCampaignSendProcessing } = await import(
      '../../../src/features/campaigns/campaigns.jobs'
    );

    await enqueueCampaignSendProcessing(
      { INNGEST_DEV: '1', INNGEST_EVENT_KEY: 'worker-event-key' },
      {
        organizationId: '22222222-2222-4222-8222-222222222222',
        campaignId: '44444444-4444-4444-8444-444444444444',
        userId: '11111111-1111-4111-8111-111111111111',
      },
    );

    expect(instances.at(-1)?.options).toMatchObject({
      id: 'retaino-api',
      eventKey: 'worker-event-key',
    });
    expect(instances.at(-1)?.setEnvVars).toHaveBeenCalledWith({
      INNGEST_DEV: '1',
      INNGEST_EVENT_KEY: 'worker-event-key',
    });
    expect(send).toHaveBeenCalledWith({
      id: 'campaign-send:22222222-2222-4222-8222-222222222222:44444444-4444-4444-8444-444444444444',
      name: 'campaigns/send.process',
      data: {
        organizationId: '22222222-2222-4222-8222-222222222222',
        campaignId: '44444444-4444-4444-8444-444444444444',
        userId: '11111111-1111-4111-8111-111111111111',
      },
    });
  });

  it('runs only one campaign send process per campaign at a time', async () => {
    await import('../../../src/features/campaigns/campaigns.jobs');

    expect(createFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'process-campaign-send',
        singleton: {
          key: 'event.data.campaignId',
          mode: 'skip',
        },
        triggers: { event: 'campaigns/send.process' },
      }),
      expect.any(Function),
    );
  });

  it('processes campaign sends directly with injected Worker bindings', async () => {
    await import('../../../src/features/campaigns/campaigns.jobs');
    const step = {
      run: vi.fn(async (_name: string, callback: () => Promise<void>) =>
        callback(),
      ),
    };

    await functionHandler?.({
      event: {
        data: {
          organizationId: '22222222-2222-4222-8222-222222222222',
          campaignId: '44444444-4444-4444-8444-444444444444',
          userId: '11111111-1111-4111-8111-111111111111',
        },
      },
      step,
      env: {
        DATABASE_URL: 'postgres://retaino.test/db',
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      },
    });

    expect(createDb).toHaveBeenCalledWith('postgres://retaino.test/db');
    expect(processCampaignSend).toHaveBeenCalledWith({
      db: 'db',
      env: {
        DATABASE_URL: 'postgres://retaino.test/db',
        SMS_SENDING_MODE: 'test',
        TRACKING_BASE_URL: 'https://go.retaino.test',
      },
      organizationId: '22222222-2222-4222-8222-222222222222',
      campaignId: '44444444-4444-4444-8444-444444444444',
      userId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('rejects campaign send events without required identifiers', async () => {
    await import('../../../src/features/campaigns/campaigns.jobs');

    await expect(
      functionHandler?.({
        event: {
          data: {
            organizationId: '22222222-2222-4222-8222-222222222222',
          },
        },
        step: { run: vi.fn() },
        env: { DATABASE_URL: 'postgres://retaino.test/db' },
      }),
    ).rejects.toThrow('Campaign send processing event is missing identifiers.');
  });
});
