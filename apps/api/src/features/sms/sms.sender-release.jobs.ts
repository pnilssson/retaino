import { Inngest } from 'inngest';
import { listOrganizationSmsSendersDueForRelease } from '@retaino/db';
import { connectAppDb } from '../../lib/db';
import { inngest } from '../../lib/inngest';
import { captureBackgroundError } from '../../lib/sentry';
import type { AppEnv } from '../../types';
import { processSmsSenderRelease } from './sms.sender-release';

type SmsSenderReleasePayload = {
  organizationId: string;
  sourceId: string;
};

export async function enqueueSmsSenderReleaseProcessing(
  env: {
    INNGEST_DEV?: string;
    INNGEST_DEVSERVER_URL?: string;
    INNGEST_EVENT_KEY?: string;
    INNGEST_SERVE_ORIGIN?: string;
    INNGEST_SERVE_PATH?: string;
  },
  payload: SmsSenderReleasePayload,
) {
  const eventKey = env.INNGEST_EVENT_KEY ?? '';
  const sender = new Inngest({
    id: 'retaino-api',
    ...(eventKey ? { eventKey } : {}),
  }).setEnvVars(env);

  await sender.send({
    id: `sms-sender-release:${payload.organizationId}:${payload.sourceId}`,
    name: 'sms/sender.release',
    data: payload,
  });
}

export const processSmsSenderReleaseFunction: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: 'process-sms-sender-release',
    singleton: {
      key: 'event.data.organizationId',
      mode: 'skip',
    },
    triggers: { event: 'sms/sender.release' },
  },
  async ({ event, step, env }) => {
    const { organizationId } = event.data as Partial<SmsSenderReleasePayload>;
    const bindings = env as AppEnv['Bindings'] | undefined;

    if (!organizationId) {
      throw new Error('SMS sender release event is missing identifiers.');
    }

    if (!bindings) {
      throw new Error('SMS sender release processing is missing Worker bindings.');
    }

    await step.run('process SMS sender release', async () => {
      await processSmsSenderRelease({
        db: await connectAppDb(bindings),
        env: bindings,
        organizationId,
      });
    });
  },
);

export const sweepSmsSenderReleasesFunction: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: 'sweep-sms-sender-releases',
    triggers: { cron: '0 * * * *' },
  },
  async ({ step, env }) => {
    const bindings = env as AppEnv['Bindings'] | undefined;

    if (!bindings) {
      throw new Error('SMS sender release sweep is missing Worker bindings.');
    }

    await step.run('sweep due SMS sender releases', async () => {
      const db = await connectAppDb(bindings);
      const senders = await listOrganizationSmsSendersDueForRelease(db, {
        now: new Date(),
        limit: 100,
      });

      for (const sender of senders) {
        try {
          await processSmsSenderRelease({
            db,
            env: bindings,
            organizationId: sender.organizationId,
          });
        } catch (error) {
          captureBackgroundError(error, {
            feature: 'sms',
            operation: 'sweep_sender_release',
            organizationId: sender.organizationId,
          });
        }
      }
    });
  },
);
