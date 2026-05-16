import { createDb } from '@retaino/db';
import { Inngest, Middleware } from 'inngest';
import type { Context as HonoContext } from 'hono';
import type { AppEnv } from '../../types';
import { processContactImport } from './contacts.service';

type ContactImportProcessPayload = {
  organizationId: string;
  contactImportId: string;
  userId: string;
};

class HonoBindingsMiddleware extends Middleware.BaseMiddleware {
  readonly id = 'hono-bindings';
  private bindings: AppEnv['Bindings'] | undefined;

  async wrapRequest({ next, requestArgs }: Middleware.WrapRequestArgs) {
    const context = requestArgs[0] as HonoContext<AppEnv> | undefined;
    this.bindings = context?.env;

    return next();
  }

  transformFunctionInput(
    args: Middleware.TransformFunctionInputArgs,
  ): Middleware.TransformFunctionInputArgs & {
    ctx: Middleware.TransformFunctionInputArgs['ctx'] & {
      env: AppEnv['Bindings'] | undefined;
    };
  } {
    return {
      ...args,
      ctx: {
        ...args.ctx,
        env: this.bindings,
      },
    };
  }
}

export const inngest = new Inngest({
  id: 'retaino-api',
  middleware: [HonoBindingsMiddleware],
});

export async function enqueueContactImportProcessing(
  env: {
    INNGEST_DEV?: string;
    INNGEST_DEVSERVER_URL?: string;
    INNGEST_EVENT_KEY?: string;
    INNGEST_SERVE_ORIGIN?: string;
    INNGEST_SERVE_PATH?: string;
  },
  payload: ContactImportProcessPayload,
) {
  const eventKey = env.INNGEST_EVENT_KEY ?? '';
  const sender = new Inngest({
    id: 'retaino-api',
    ...(eventKey ? { eventKey } : {}),
  }).setEnvVars(env);

  await sender.send({
    name: 'contacts/import.process',
    data: payload,
  });
}

export const processContactImportFunction: ReturnType<
  typeof inngest.createFunction
> = inngest.createFunction(
  {
    id: 'process-contact-import',
    triggers: { event: 'contacts/import.process' },
  },
  async ({ event, step, env }) => {
    const { organizationId, contactImportId } = event.data as Partial<
      ContactImportProcessPayload
    >;
    const bindings = env as AppEnv['Bindings'] | undefined;

    if (!organizationId || !contactImportId) {
      throw new Error('Contact import processing event is missing identifiers.');
    }

    if (!bindings?.DATABASE_URL || !bindings.CONTACT_IMPORTS_BUCKET) {
      throw new Error('Contact import processing is missing Worker bindings.');
    }

    await step.run('process contact import', async () => {
      await processContactImport({
        db: createDb(bindings.DATABASE_URL),
        bucket: bindings.CONTACT_IMPORTS_BUCKET,
        organizationId,
        contactImportId,
      });
    });
  },
);
