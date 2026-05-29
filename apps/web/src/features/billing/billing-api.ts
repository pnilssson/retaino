import type {
  BillingCheckoutUrlResponse,
  BillingPlanKey,
  BillingPortalUrlResponse,
  BillingStatusResponse,
} from '@retaino/shared/contracts';
import type { createApiClient } from '@/lib/api-client';

type ApiClient = ReturnType<typeof createApiClient>;

export function fetchBillingStatus(api: ApiClient) {
  return api.get<BillingStatusResponse>('/v1/billing/status');
}

export function createSubscriptionCheckout(
  api: ApiClient,
  planKey: BillingPlanKey,
) {
  return api.post<BillingCheckoutUrlResponse>(
    '/v1/billing/checkout/subscription',
    { planKey },
  );
}

export function createBillingPortalSession(api: ApiClient) {
  return api.post<BillingPortalUrlResponse>('/v1/billing/portal');
}
