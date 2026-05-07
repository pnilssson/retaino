import { idSchema, type ApiErrorCode } from '@retaino/shared/schemas';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { apiError } from './errors';

type AppContext = Context<AppEnv>;

type ServiceRouteResult<T> =
  | {
      ok: true;
      status: number;
      data: T;
    }
  | {
      ok: false;
      status: number;
      code: ApiErrorCode;
      message: string;
    };

export function parseIdParam(c: AppContext, name: string, message: string) {
  const parsed = idSchema.safeParse(c.req.param(name));

  if (!parsed.success) {
    return {
      ok: false as const,
      response: c.json(apiError('validation_failed', message, z.treeifyError(parsed.error)), 400),
    };
  }

  return { ok: true as const, data: parsed.data };
}

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

export function sendResult<T>(c: AppContext, result: ServiceRouteResult<T>) {
  if (!result.ok) {
    return c.json(apiError(result.code, result.message), result.status as ContentfulStatusCode);
  }

  return c.json(result.data, result.status as ContentfulStatusCode);
}
