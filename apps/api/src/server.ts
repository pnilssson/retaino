import { Hono } from 'hono';
import { serve } from 'inngest/hono';
import { billingRoutes } from './features/billing/billing.routes';
import { contactsRoutes } from './features/contacts/contacts.routes';
import {
  inngest,
  processContactImportFunction,
} from './features/contacts/contacts.jobs';
import { healthRoutes } from './features/health/health.routes';
import { legalRoutes } from './features/legal/legal.routes';
import { organizationRoutes } from './features/organization/organization.routes';
import { apiError } from './lib/errors';
import { authMiddleware } from './middleware/auth';
import { corsMiddleware } from './middleware/cors';
import { dbMiddleware } from './middleware/db';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();
const inngestHandler = serve({
  client: inngest,
  functions: [processContactImportFunction],
});

app.route('/health', healthRoutes);
app.get('/', (c) => c.redirect('/health'));
app.all('/v1/inngest', (c) => inngestHandler(c));

app.use('/v1/*', corsMiddleware);
app.use('/v1/*', dbMiddleware);
app.route('/v1/legal', legalRoutes);
app.use('/v1/*', authMiddleware);

app.route('/v1/organization', organizationRoutes);
app.route('/v1/billing', billingRoutes);
app.route('/v1/contacts', contactsRoutes);

app.notFound((c) => {
  return c.json(apiError('internal_error', 'Route not found.'), 404);
});

app.onError((error, c) => {
  console.error(error);
  return c.json(apiError('internal_error', 'Unexpected API error.'), 500);
});

export default app;
