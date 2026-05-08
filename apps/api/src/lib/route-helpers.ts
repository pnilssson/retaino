import type { Context } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { apiError } from './errors';

type AppContext = Context<AppEnv>;

export async function parseJsonBody<TSchema extends z.ZodType>(
  c: AppContext,
  schema: TSchema,
  message: string,
  fallback: unknown = null,
) {
  const body = await c.req.json().catch(() => fallback);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false as const,
      response: c.json(apiError('validation_failed', message, z.treeifyError(parsed.error)), 400),
    };
  }

  return { ok: true as const, data: parsed.data as z.infer<TSchema> };
}
