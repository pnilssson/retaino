import { createDb } from '@retaino/db';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types';

export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set('db', createDb(c.env.DATABASE_URL));
  await next();
});
