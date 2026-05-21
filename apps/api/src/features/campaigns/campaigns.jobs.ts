import { createDb } from '@retaino/db';
import { Inngest } from 'inngest';
import { inngest } from '../../lib/inngest';
import type { AppEnv } from '../../types';
import { processCampaignSend } from './campaigns.service';

type CampaignSendProcessPayload = {
  organizationId: string;
  campaignId: string;
  userId: string;
};

export async function enqueueCampaignSendProcessing(
  env: {
    INNGEST_DEV?: string;
    INNGEST_DEVSERVER_URL?: string;
    INNGEST_EVENT_KEY?: string;
    INNGEST_SERVE_ORIGIN?: string;
    INNGEST_SERVE_PATH?: string;
  },
  payload: CampaignSendProcessPayload,
) {
  const eventKey = env.INNGEST_EVENT_KEY ?? '';
  const sender = new Inngest({
    id: 'retaino-api',
    ...(eventKey ? { eventKey } : {}),
  }).setEnvVars(env);

  await sender.send({
    id: campaignSendEventId(payload),
    name: 'campaigns/send.process',
    data: payload,
  });
}

export const processCampaignSendFunction: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: 'process-campaign-send',
    singleton: {
      key: 'event.data.campaignId',
      mode: 'skip',
    },
    triggers: { event: 'campaigns/send.process' },
  },
  async ({ event, step, env }) => {
    const { organizationId, campaignId, userId } = event.data as Partial<
      CampaignSendProcessPayload
    >;
    const bindings = env as AppEnv['Bindings'] | undefined;

    if (!organizationId || !campaignId || !userId) {
      throw new Error('Campaign send processing event is missing identifiers.');
    }

    if (!bindings?.DATABASE_URL) {
      throw new Error('Campaign send processing is missing Worker bindings.');
    }

    await step.run('process campaign send', async () => {
      await processCampaignSend({
        db: createDb(bindings.DATABASE_URL),
        env: bindings,
        organizationId,
        campaignId,
        userId,
      });
    });
  },
);

function campaignSendEventId(payload: CampaignSendProcessPayload) {
  return `campaign-send:${payload.organizationId}:${payload.campaignId}`;
}
