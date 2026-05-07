import { Hono } from 'hono';
import { healthRoutes } from './features/health/health.routes';
import { legalRoutes } from './features/legal/legal.routes';
import { organizationRoutes } from './features/organization/organization.routes';
import { apiError } from './lib/errors';
import { authMiddleware } from './middleware/auth';
import { corsMiddleware } from './middleware/cors';
import { dbMiddleware } from './middleware/db';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.route('/health', healthRoutes);
app.get('/', (c) => c.redirect('/health'));

app.use('/v1/*', corsMiddleware);
app.use('/v1/*', dbMiddleware);
app.route('/v1/legal', legalRoutes);
app.use('/v1/*', authMiddleware);

app.route('/v1', organizationRoutes);

app.notFound((c) => {
  return c.json(apiError('internal_error', 'Route not found.'), 404);
});

app.onError((error, c) => {
  console.error(error);
  return c.json(apiError('internal_error', 'Unexpected API error.'), 500);
});

export default app;
