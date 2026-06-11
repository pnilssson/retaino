import {
  canManageOrganizationSetup,
  createSubscriptionCheckoutSchema,
} from '@retaino/shared/contracts';
import { Hono, type Context } from 'hono';
import { getStripeBillingCatalog } from './billing.catalog';
import {
  BillingCustomerMissingError,
  BillingSessionUrlMissingError,
  BillingSubscriptionAlreadyExistsError,
  createCustomerPortalSession,
  createSubscriptionCheckout,
  getBillingStatus,
} from './billing.service';
import { apiError } from '../../lib/errors';
import { parseJsonBody } from '../../lib/route-helpers';
import {
  createStripeClient,
  getStripeConfig,
} from '../../lib/stripe';
import { requestLocale } from '../../lib/locale';
import type { AppEnv } from '../../types';

export const billingRoutes = new Hono<AppEnv>()
  .get('/status', async (c) => {
    return c.json(
      await getBillingStatus({
        db: c.get('db'),
        organizationId: c.get('organization').id,
      }),
    );
  })
  .post('/checkout/subscription', async (c) => {
    const gate = requireBillingAdmin(c);

    if (!gate.ok) {
      return gate.response;
    }

    const parsed = await parseJsonBody(
      c,
      createSubscriptionCheckoutSchema,
      'Invalid subscription checkout request.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    try {
      return c.json(
        await createSubscriptionCheckout({
          db: c.get('db'),
          stripe: createStripeClient(c.env),
          config: getStripeConfig(c.env, requestLocale(c)),
          catalog: getStripeBillingCatalog(c.env),
          organization: c.get('organization'),
          user: c.get('user'),
          planKey: parsed.data.planKey,
        }),
      );
    } catch (error) {
      if (error instanceof BillingSubscriptionAlreadyExistsError) {
        return c.json(
          apiError(
            'validation_failed',
            'Organization already has an active subscription. Use the billing portal to manage it.',
          ),
          409,
        );
      }

      throw error;
    }
  })
  .post('/portal', async (c) => {
    const gate = requireBillingAdmin(c);

    if (!gate.ok) {
      return gate.response;
    }

    try {
      return c.json(
        await createCustomerPortalSession({
          db: c.get('db'),
          stripe: createStripeClient(c.env),
          config: getStripeConfig(c.env, requestLocale(c)),
          organizationId: c.get('organization').id,
        }),
      );
    } catch (error) {
      if (error instanceof BillingCustomerMissingError) {
        return c.json(
          apiError('not_found', 'Billing customer was not found.'),
          404,
        );
      }

      if (error instanceof BillingSessionUrlMissingError) {
        return c.json(
          apiError('internal_error', 'Stripe did not return a portal URL.'),
          502,
        );
      }

      throw error;
    }
  });

function requireBillingAdmin(c: Context<AppEnv>) {
  if (!canManageOrganizationSetup(c.get('organization').role)) {
    return {
      ok: false as const,
      response: c.json(
        apiError('forbidden', 'Only organization admins can manage billing.'),
        403,
      ),
    };
  }

  return { ok: true as const };
}
