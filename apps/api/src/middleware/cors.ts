import { cors } from 'hono/cors';
import { allowedBrowserOrigins } from '../lib/origins';

export const corsMiddleware = cors({
  origin: (origin, c) => {
    return allowedBrowserOrigins(c.env.APP_ALLOWED_ORIGINS).includes(origin)
      ? origin
      : null;
  },
  allowHeaders: ['Authorization', 'Content-Type', 'x-retaino-locale'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  maxAge: 600,
});
