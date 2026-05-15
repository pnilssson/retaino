import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSmsCreditTransaction,
  getBillingWebhookEventByStripeEventId,
  markBillingWebhookEventProcessed,
  recordBillingWebhookEvent,
  upsertOrganizationBillingProfile,
} from '@retaino/db';
import {
  processStripeBillingWebhook,
  verifyStripeWebhookEvent,
} from '../../../src/features/billing/billing.webhooks';

vi.mock('@retaino/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@retaino/db')>();

  return {
    ...actual,
    createSmsCreditTransaction: vi.fn(),
    getBillingWebhookEventByStripeEventId: vi.fn(),
    markBillingWebhookEventProcessed: vi.fn(),
    recordBillingWebhookEvent: vi.fn(),
    upsertOrganizationBillingProfile: vi.fn(),
  };
});

const db = {} as never;
const organizationId = '22222222-2222-4222-8222-222222222222';

describe('Stripe billing webhooks', () => {
  beforeEach(() => {
    vi.mocked(createSmsCreditTransaction).mockReset();
    vi.mocked(getBillingWebhookEventByStripeEventId).mockReset();
    vi.mocked(markBillingWebhookEventProcessed).mockReset();
    vi.mocked(recordBillingWebhookEvent).mockReset();
    vi.mocked(upsertOrganizationBillingProfile).mockReset();
    vi.mocked(recordBillingWebhookEvent).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      stripeEventId: 'evt_123',
      eventType: 'checkout.session.completed',
      organizationId,
      status: 'received',
      payload: {},
      receivedAt: new Date('2026-05-15T00:00:00.000Z'),
      processedAt: null,
    });
  });

  it('verifies Stripe webhook signatures from the raw request body', async () => {
    const payload = JSON.stringify({ id: 'evt_123', type: 'invoice.paid' });
    const stripe = {
      webhooks: {
        constructEventAsync: vi.fn().mockResolvedValue({
          id: 'evt_123',
          type: 'invoice.paid',
        }),
      },
    };

    await expect(
      verifyStripeWebhookEvent({
        stripe,
        payload,
        signature: 't=123,v1=abc',
        webhookSecret: 'whsec_123',
      }),
    ).resolves.toMatchObject({ id: 'evt_123' });
    expect(stripe.webhooks.constructEventAsync).toHaveBeenCalledWith(
      payload,
      't=123,v1=abc',
      'whsec_123',
    );
  });

  it('skips already processed duplicate Stripe events', async () => {
    vi.mocked(recordBillingWebhookEvent).mockResolvedValue(null);
    vi.mocked(getBillingWebhookEventByStripeEventId).mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      stripeEventId: 'evt_123',
      eventType: 'checkout.session.completed',
      organizationId,
      status: 'processed',
      payload: {},
      receivedAt: new Date('2026-05-15T00:00:00.000Z'),
      processedAt: new Date('2026-05-15T00:00:00.000Z'),
    });

    await expect(
      processStripeBillingWebhook({
        db,
        event: creditPackCheckoutEvent(),
      }),
    ).resolves.toEqual({ status: 'duplicate' });
    expect(createSmsCreditTransaction).not.toHaveBeenCalled();
  });

  it('grants purchased credits from completed credit pack Checkout sessions', async () => {
    await processStripeBillingWebhook({
      db,
      event: creditPackCheckoutEvent(),
    });

    expect(recordBillingWebhookEvent).toHaveBeenCalledWith(expect.anything(), {
      stripeEventId: 'evt_123',
      eventType: 'checkout.session.completed',
      organizationId,
      payload: expect.objectContaining({ id: 'evt_123' }),
    });
    expect(createSmsCreditTransaction).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      transactionType: 'grant',
      credits: 1500,
      creditBucket: 'purchased',
      periodStart: null,
      periodEnd: null,
      source: 'stripe_checkout_session',
      sourceId: 'cs_123',
      description: '1,500 credits purchase',
    });
    expect(markBillingWebhookEventProcessed).toHaveBeenCalledWith(
      expect.anything(),
      'evt_123',
    );
  });

  it('grants included subscription credits from paid invoices', async () => {
    await processStripeBillingWebhook({
      db,
      event: invoicePaidEvent(),
    });

    expect(createSmsCreditTransaction).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      transactionType: 'grant',
      credits: 1000,
      creditBucket: 'subscription_period',
      periodStart: new Date('2026-05-15T00:00:00.000Z'),
      periodEnd: new Date('2026-06-15T00:00:00.000Z'),
      source: 'stripe_invoice',
      sourceId: 'sub_123:1778803200:1781481600',
      description: 'Growth monthly credits',
    });
  });

  it('preserves invoice organization ids in webhook audit rows', async () => {
    await processStripeBillingWebhook({
      db,
      event: invoicePaidEvent(),
    });

    expect(recordBillingWebhookEvent).toHaveBeenCalledWith(expect.anything(), {
      stripeEventId: 'evt_invoice_paid',
      eventType: 'invoice.paid',
      organizationId,
      payload: expect.objectContaining({ id: 'evt_invoice_paid' }),
    });
  });

  it('does not grant monthly credits for prorated subscription update invoices', async () => {
    await processStripeBillingWebhook({
      db,
      event: subscriptionUpdateInvoicePaidEvent(),
    });

    expect(createSmsCreditTransaction).not.toHaveBeenCalled();
  });

  it('ignores non-Retaino invoices from the same Stripe account', async () => {
    await processStripeBillingWebhook({
      db,
      event: unrelatedInvoicePaidEvent(),
    });

    expect(createSmsCreditTransaction).not.toHaveBeenCalled();
    expect(markBillingWebhookEventProcessed).toHaveBeenCalledWith(
      expect.anything(),
      'evt_unrelated_invoice',
    );
  });

  it('updates the local billing projection from subscription events', async () => {
    await processStripeBillingWebhook({
      db,
      event: subscriptionUpdatedEvent(),
    });

    expect(upsertOrganizationBillingProfile).toHaveBeenCalledWith(
      expect.anything(),
      {
        organizationId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        stripePriceId: 'price_growth',
        planKey: 'growth',
        subscriptionStatus: 'active',
        currentPeriodStart: new Date('2026-05-15T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-06-15T00:00:00.000Z'),
        cancelAtPeriodEnd: false,
      },
    );
  });

  it('marks subscription payment failures as past due', async () => {
    await processStripeBillingWebhook({
      db,
      event: invoicePaymentFailedEvent(),
    });

    expect(upsertOrganizationBillingProfile).toHaveBeenCalledWith(
      expect.anything(),
      {
        organizationId,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        stripePriceId: null,
        planKey: 'growth',
        subscriptionStatus: 'past_due',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    );
  });

  it('updates the local billing projection from cancellation events', async () => {
    await processStripeBillingWebhook({
      db,
      event: subscriptionDeletedEvent(),
    });

    expect(upsertOrganizationBillingProfile).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId,
        stripeSubscriptionId: 'sub_123',
        subscriptionStatus: 'canceled',
      }),
    );
  });

  it('does not adjust credits for partial credit pack refunds', async () => {
    await processStripeBillingWebhook({
      db,
      event: partialChargeRefundedEvent(),
    });

    expect(createSmsCreditTransaction).not.toHaveBeenCalled();
  });

  it('creates negative credit adjustments for fully refunded credit packs', async () => {
    await processStripeBillingWebhook({
      db,
      event: fullChargeRefundedEvent(),
    });

    expect(createSmsCreditTransaction).toHaveBeenCalledWith(expect.anything(), {
      organizationId,
      transactionType: 'adjustment',
      credits: -1500,
      creditBucket: 'purchased',
      periodStart: null,
      periodEnd: null,
      source: 'stripe_refund',
      sourceId: 'ch_123',
      description: '1,500 credits refund adjustment',
    });
  });
});

function creditPackCheckoutEvent() {
  return {
    id: 'evt_123',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_123',
        object: 'checkout.session',
        payment_status: 'paid',
        metadata: {
          organizationId,
          purpose: 'credit_pack',
          packKey: 'credits_1500',
        },
      },
    },
  } as never;
}

function invoicePaidEvent() {
  return {
    id: 'evt_invoice_paid',
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_123',
        object: 'invoice',
        billing_reason: 'subscription_cycle',
        period_start: 1778803200,
        period_end: 1781481600,
        metadata: {},
        parent: {
          type: 'subscription_details',
          subscription_details: {
            subscription: 'sub_123',
            metadata: {
              organizationId,
              planKey: 'growth',
            },
          },
        },
      },
    },
  } as never;
}

function subscriptionUpdateInvoicePaidEvent() {
  return {
    id: 'evt_invoice_subscription_update',
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_update',
        object: 'invoice',
        billing_reason: 'subscription_update',
        period_start: 1778803200,
        period_end: 1781481600,
        metadata: {},
        parent: {
          type: 'subscription_details',
          subscription_details: {
            subscription: 'sub_123',
            metadata: {
              organizationId,
              planKey: 'scale',
            },
          },
        },
      },
    },
  } as never;
}

function unrelatedInvoicePaidEvent() {
  return {
    id: 'evt_unrelated_invoice',
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_unrelated',
        object: 'invoice',
        parent: null,
      },
    },
  } as never;
}

function invoicePaymentFailedEvent() {
  return {
    id: 'evt_invoice_failed',
    type: 'invoice.payment_failed',
    data: {
      object: {
        id: 'in_failed',
        object: 'invoice',
        customer: 'cus_123',
        parent: {
          type: 'subscription_details',
          subscription_details: {
            subscription: 'sub_123',
            metadata: {
              organizationId,
              planKey: 'growth',
            },
          },
        },
      },
    },
  } as never;
}

function subscriptionUpdatedEvent() {
  return {
    id: 'evt_subscription_updated',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_123',
        object: 'subscription',
        customer: 'cus_123',
        status: 'active',
        cancel_at_period_end: false,
        metadata: {
          organizationId,
          planKey: 'growth',
        },
        items: {
          data: [
            {
              current_period_start: 1778803200,
              current_period_end: 1781481600,
              price: {
                id: 'price_growth',
              },
            },
          ],
        },
      },
    },
  } as never;
}

function subscriptionDeletedEvent() {
  return {
    id: 'evt_subscription_deleted',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        id: 'sub_123',
        object: 'subscription',
        customer: 'cus_123',
        status: 'canceled',
        cancel_at_period_end: false,
        metadata: {
          organizationId,
          planKey: 'growth',
        },
        items: {
          data: [
            {
              current_period_start: 1778803200,
              current_period_end: 1781481600,
              price: {
                id: 'price_growth',
              },
            },
          ],
        },
      },
    },
  } as never;
}

function partialChargeRefundedEvent() {
  return {
    id: 'evt_charge_partially_refunded',
    type: 'charge.refunded',
    data: {
      object: {
        id: 'ch_123',
        object: 'charge',
        amount: 165000,
        amount_refunded: 82500,
        refunded: false,
        metadata: {
          organizationId,
          packKey: 'credits_1500',
        },
      },
    },
  } as never;
}

function fullChargeRefundedEvent() {
  return {
    id: 'evt_charge_refunded',
    type: 'charge.refunded',
    data: {
      object: {
        id: 'ch_123',
        object: 'charge',
        amount: 165000,
        amount_refunded: 165000,
        refunded: true,
        metadata: {
          organizationId,
          packKey: 'credits_1500',
        },
      },
    },
  } as never;
}
