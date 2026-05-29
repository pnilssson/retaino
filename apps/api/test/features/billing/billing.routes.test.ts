import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BillingSubscriptionAlreadyExistsError,
  createCustomerPortalSession,
  createSubscriptionCheckout,
  getBillingStatus,
} from '../../../src/features/billing/billing.service';
import { billingRoutes } from '../../../src/features/billing/billing.routes';
import type { AppEnv } from '../../../src/types';

vi.mock('../../../src/features/billing/billing.service', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../../src/features/billing/billing.service')
  >();

  return {
    ...actual,
    createCustomerPortalSession: vi.fn(),
    createSubscriptionCheckout: vi.fn(),
    getBillingStatus: vi.fn(),
  };
});

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  clerkUserId: 'user_123',
  email: 'ada@retaino.test',
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
};
const organization = {
  id: '22222222-2222-4222-8222-222222222222',
  clerkOrganizationId: 'org_123',
  name: 'Retaino',
  slug: 'retaino',
  onboardingStatus: 'complete',
  role: 'org:admin',
};
const env = {
  STRIPE_CANCEL_URL: 'https://retaino.test/app/settings/billing',
  STRIPE_PRICE_ADVANCED_ID: 'price_advanced',
  STRIPE_PRICE_CORE_ID: 'price_core',
  STRIPE_PRICE_GROWTH_ID: 'price_growth',
  STRIPE_PRICE_PRO_ID: 'price_pro',
  STRIPE_PRICE_SCALE_ID: 'price_scale',
  STRIPE_PRICE_STARTER_ID: 'price_starter',
  STRIPE_RETURN_URL: 'https://retaino.test/app/settings/billing',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_SUCCESS_URL: 'https://retaino.test/app/settings/billing/success',
  STRIPE_WEBHOOK_SECRET: 'whsec_123',
};

function testApp(input: { role?: string } = {}) {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    c.set('user', user);
    c.set('organization', {
      ...organization,
      role: input.role ?? organization.role,
    });
    await next();
  });

  app.route('/v1/billing', billingRoutes);
  return app;
}

describe('billing routes', () => {
  beforeEach(() => {
    vi.mocked(getBillingStatus).mockReset();
    vi.mocked(createSubscriptionCheckout).mockReset();
    vi.mocked(createCustomerPortalSession).mockReset();
  });

  it('returns billing status for the active organization', async () => {
    vi.mocked(getBillingStatus).mockResolvedValue({
      subscription: {
        status: 'active',
        planKey: 'growth',
        currentPeriodEnd: '2026-06-15T00:00:00.000Z',
        cancelAtPeriodEnd: false,
      },
      smsCredits: { balance: 1200 },
      portalAvailable: true,
    });

    const response = await testApp().request(
      '/v1/billing/status',
      undefined,
      env,
    );

    expect(response.status).toBe(200);
    expect(getBillingStatus).toHaveBeenCalledWith({
      db: expect.anything(),
      organizationId: organization.id,
    });
    await expect(response.json()).resolves.toMatchObject({
      smsCredits: { balance: 1200 },
    });
  });

  it('creates subscription checkout for organization admins', async () => {
    vi.mocked(createSubscriptionCheckout).mockResolvedValue({
      url: 'https://checkout.test/subscription',
    });

    const response = await testApp().request(
      '/v1/billing/checkout/subscription',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planKey: 'growth' }),
      },
      env,
    );

    expect(response.status).toBe(200);
    expect(createSubscriptionCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        db: expect.anything(),
        organization,
        user,
        planKey: 'growth',
      }),
    );
    await expect(response.json()).resolves.toEqual({
      url: 'https://checkout.test/subscription',
    });
  });

  it('rejects checkout creation from non-admin members', async () => {
    const response = await testApp({ role: 'org:member' }).request(
      '/v1/billing/checkout/subscription',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planKey: 'growth' }),
      },
      env,
    );

    expect(response.status).toBe(403);
    expect(createSubscriptionCheckout).not.toHaveBeenCalled();
  });

  it('rejects invalid checkout plans before calling Stripe', async () => {
    const response = await testApp().request(
      '/v1/billing/checkout/subscription',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planKey: 'enterprise' }),
      },
      env,
    );

    expect(response.status).toBe(400);
    expect(createSubscriptionCheckout).not.toHaveBeenCalled();
  });

  it('rejects subscription checkout when the organization is already subscribed', async () => {
    vi.mocked(createSubscriptionCheckout).mockRejectedValue(
      new BillingSubscriptionAlreadyExistsError(),
    );

    const response = await testApp().request(
      '/v1/billing/checkout/subscription',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ planKey: 'growth' }),
      },
      env,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'validation_failed',
      },
    });
  });

  it('creates customer portal sessions for organization admins', async () => {
    vi.mocked(createCustomerPortalSession).mockResolvedValue({
      url: 'https://portal.test/session',
    });

    const response = await testApp().request(
      '/v1/billing/portal',
      {
        method: 'POST',
      },
      env,
    );

    expect(response.status).toBe(200);
    expect(createCustomerPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        db: expect.anything(),
        organizationId: organization.id,
      }),
    );
    await expect(response.json()).resolves.toEqual({
      url: 'https://portal.test/session',
    });
  });
});
