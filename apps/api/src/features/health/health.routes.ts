import { Hono } from 'hono';

export const healthRoutes = new Hono().get('/', (c) => {
  return c.json({ ok: true, service: 'api' });
});
