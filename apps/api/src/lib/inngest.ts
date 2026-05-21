import { Inngest, Middleware } from 'inngest';
import type { Context as HonoContext } from 'hono';
import type { AppEnv } from '../types';

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
