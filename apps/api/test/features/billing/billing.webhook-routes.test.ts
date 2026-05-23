import Stripe from 'stripe';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processStripeBillingWebhook } from '../../../src/features/billing/billing.webhooks';
import { billingWebhookRoutes } from '../../../src/features/billing/billing.webhook-routes';
import type { AppEnv } from '../../../src/types';

const dbMocks = vi.hoisted(() => ({
  connectDb: vi.fn(),
}));

vi.mock('@retaino/db', () => ({
  connectDb: dbMocks.connectDb,
}));

vi.mock('../../../src/features/billing/billing.webhooks', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../../src/features/billing/billing.webhooks')
  >();

  return {
    ...actual,
    processStripeBillingWebhook: vi.fn(),
  };
});

const env = {
  HYPERDRIVE: {
    connectionString: 'postgresql://user:password@example.test/retaino',
  },
  STRIPE_CANCEL_URL: 'https://retaino.test/app/settings/billing',
  STRIPE_PRICE_CREDITS_1500_ID: 'price_credits_1500',
  STRIPE_PRICE_CREDITS_5000_ID: 'price_credits_5000',
  STRIPE_PRICE_CREDITS_500_ID: 'price_credits_500',
  STRIPE_PRICE_GROWTH_ID: 'price_growth',
  STRIPE_PRICE_SCALE_ID: 'price_scale',
  STRIPE_PRICE_STARTER_ID: 'price_starter',
  STRIPE_RETURN_URL: 'https://retaino.test/app/settings/billing',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_SUCCESS_URL: 'https://retaino.test/app/settings/billing/success',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
};

function testApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    await next();
  });

  app.route('/v1/billing', billingWebhookRoutes);
  return app;
}

describe('billing webhook routes', () => {
  beforeEach(() => {
    vi.mocked(processStripeBillingWebhook).mockReset();
    vi.mocked(processStripeBillingWebhook).mockResolvedValue({
      status: 'processed',
    });
    dbMocks.connectDb.mockReset();
    dbMocks.connectDb.mockResolvedValue({ db: {}, close: vi.fn() });
  });

  it('rejects requests without a valid Stripe signature', async () => {
    const response = await testApp().request(
      '/v1/billing/webhooks',
      {
        method: 'POST',
        body: JSON.stringify({ id: 'evt_123' }),
      },
      env,
    );

    expect(response.status).toBe(400);
    expect(processStripeBillingWebhook).not.toHaveBeenCalled();
    expect(dbMocks.connectDb).not.toHaveBeenCalled();
  });

  it('accepts signed Stripe webhook requests before Clerk auth', async () => {
    const payload = JSON.stringify({
      id: 'evt_123',
      object: 'event',
      type: 'invoice.paid',
      data: { object: { id: 'in_123', object: 'invoice' } },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: env.STRIPE_WEBHOOK_SECRET,
    });

    const response = await testApp().request(
      '/v1/billing/webhooks',
      {
        method: 'POST',
        headers: {
          'stripe-signature': signature,
        },
        body: payload,
      },
      env,
    );

    expect(response.status).toBe(200);
    expect(dbMocks.connectDb).toHaveBeenCalledWith(
      env.HYPERDRIVE.connectionString,
    );
    expect(processStripeBillingWebhook).toHaveBeenCalledWith({
      db: expect.anything(),
      event: expect.objectContaining({
        id: 'evt_123',
        type: 'invoice.paid',
      }),
    });
  });
});
