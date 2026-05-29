import { Hono } from 'hono';
import Stripe from 'stripe';
import { connectAppDb } from '../../lib/db';
import { apiError } from '../../lib/errors';
import { captureHandledError } from '../../lib/sentry';
import { getStripeWebhookSecret } from '../../lib/stripe';
import type { AppEnv } from '../../types';
import { enqueueSmsSenderReleaseProcessing } from '../sms/sms.sender-release.jobs';
import {
  processStripeBillingWebhook,
  verifyStripeWebhookEvent,
} from './billing.webhooks';

export const billingWebhookRoutes = new Hono<AppEnv>().post(
  '/webhooks',
  async (c) => {
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json(apiError('validation_failed', 'Stripe signature is required.'), 400);
    }

    const payload = await c.req.text();
    let event;

    try {
      event = await verifyStripeWebhookEvent({
        stripe: Stripe,
        payload,
        signature,
        webhookSecret: getStripeWebhookSecret(c.env),
      });
    } catch {
      return c.json(apiError('validation_failed', 'Invalid Stripe signature.'), 400);
    }

    const result = await processStripeBillingWebhook({
      db: await connectAppDb(c.env),
      event,
    });

    if (result.senderReleaseDueOrganizationId) {
      try {
        await enqueueSmsSenderReleaseProcessing(c.env, {
          organizationId: result.senderReleaseDueOrganizationId,
          sourceId: `stripe-event:${event.id}`,
        });
      } catch (error) {
        captureHandledError(error, c, {
          feature: 'billing',
          operation: 'enqueue_sms_sender_release',
          organizationId: result.senderReleaseDueOrganizationId,
        });
      }
    }

    return c.json({ received: true, status: result.status });
  },
);
