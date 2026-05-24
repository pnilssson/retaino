import { Hono } from 'hono';
import { serve } from 'inngest/hono';
import { billingRoutes } from './features/billing/billing.routes';
import { billingWebhookRoutes } from './features/billing/billing.webhook-routes';
import { processCampaignSendFunction } from './features/campaigns/campaigns.jobs';
import { campaignsRoutes } from './features/campaigns/campaigns.routes';
import { contactsRoutes } from './features/contacts/contacts.routes';
import { processContactImportFunction } from './features/contacts/contacts.jobs';
import { healthRoutes } from './features/health/health.routes';
import { inboxRoutes } from './features/inbox/inbox.routes';
import { legalRoutes } from './features/legal/legal.routes';
import { organizationRoutes } from './features/organization/organization.routes';
import { smsRoutes } from './features/sms/sms.routes';
import { twilioMessagingWebhookRoutes } from './features/sms/sms.webhook-routes';
import { trackingRoutes } from './features/tracking/tracking.routes';
import { apiError } from './lib/errors';
import { inngest } from './lib/inngest';
import { authMiddleware } from './middleware/auth';
import { corsMiddleware } from './middleware/cors';
import { dbMiddleware } from './middleware/db';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();
const inngestHandler = serve({
  client: inngest,
  functions: [processContactImportFunction, processCampaignSendFunction],
});

app.route('/health', healthRoutes);
app.get('/', (c) => c.redirect('/health'));
app.all('/v1/inngest', (c) => inngestHandler(c));
app.use('/r/*', dbMiddleware);
app.route('/r', trackingRoutes);

app.use('/v1/*', corsMiddleware);
app.route('/v1/billing', billingWebhookRoutes);
app.use('/v1/legal/*', dbMiddleware);
app.route('/v1/legal', legalRoutes);
app.use('/v1/webhooks/twilio/messaging/*', dbMiddleware);
app.route('/v1/webhooks/twilio/messaging', twilioMessagingWebhookRoutes);
app.use('/v1/*', authMiddleware);

app.route('/v1/organization', organizationRoutes);
app.route('/v1/billing', billingRoutes);
app.route('/v1/contacts', contactsRoutes);
app.route('/v1/campaigns', campaignsRoutes);
app.route('/v1/inbox', inboxRoutes);
app.route('/v1/sms', smsRoutes);

app.notFound((c) => {
  return c.json(apiError('internal_error', 'Route not found.'), 404);
});

app.onError((error, c) => {
  console.error(error);
  return c.json(apiError('internal_error', 'Unexpected API error.'), 500);
});

export default app;
