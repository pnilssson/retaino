import type { OverviewResponse } from '@retaino/shared/contracts';
import type { createApiClient } from '@/lib/api-client';

type ApiClient = ReturnType<typeof createApiClient>;

export function fetchOverview(api: ApiClient) {
  return api.get<OverviewResponse>('/v1/overview');
}
