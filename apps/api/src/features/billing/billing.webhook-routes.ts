import { Hono } from 'hono';
import { createDb } from '@retaino/db';
import Stripe from 'stripe';
import { apiError } from '../../lib/errors';
import { getStripeWebhookSecret } from '../../lib/stripe';
import type { AppEnv } from '../../types';
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

    const db = createDb(c.env.DATABASE_URL);
    const result = await processStripeBillingWebhook({
      db,
      event,
    });

    return c.json({ received: true, status: result.status });
  },
);
