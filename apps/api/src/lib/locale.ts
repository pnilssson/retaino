import { normalizeLocale } from '@retaino/shared';
import type { Context } from 'hono';
import type { AppEnv } from '../types';

export function requestLocale(c: Context<AppEnv>) {
  return normalizeLocale(c.req.header('x-retaino-locale'));
}
