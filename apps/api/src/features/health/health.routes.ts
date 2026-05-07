import { Hono } from 'hono';

export const healthRoutes = new Hono().get('/', (c) => {
  return c.json({
    name: 'retaino-api',
    status: 'ok',
  });
});
