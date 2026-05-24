import { createMiddleware } from 'hono/factory';
import { connectAppDb } from '../lib/db';
import type { AppEnv } from '../types';

export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const db = await connectAppDb(c.env);

  c.set('db', db);

  await next();
});
