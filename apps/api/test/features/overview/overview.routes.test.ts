import { getOverviewDashboard } from '@retaino/db';
import type { OverviewResponse } from '@retaino/shared/contracts';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { overviewRoutes } from '../../../src/features/overview/overview.routes';
import type { AppEnv } from '../../../src/types';

vi.mock('@retaino/db', () => ({
  getOverviewDashboard: vi.fn(),
}));

const organizationId = '22222222-2222-4222-8222-222222222222';
const overview: OverviewResponse = {
  window: {
    startDate: '2026-05-01',
    endDate: '2026-05-30',
    days: 30,
  },
  metrics: {
    reportedRevenueAmountMinor: 125000,
    reportedRevenueCurrency: 'SEK',
    reportedRevenueHasMixedCurrencies: false,
    reportedBookingCount: 4,
    needsReplyCount: 2,
    smsCreditBalance: 180,
  },
  sender: {
    phoneNumber: '+46701234567',
    status: 'ready',
    countryCode: 'SE',
    releaseScheduledAt: null,
  },
  trend: [
    {
      date: '2026-05-29',
      deliveredSmsCount: 40,
      reportedBookingCount: 2,
      reportedRevenueAmountMinor: 75000,
    },
  ],
  funnel: {
    selectedCount: 120,
    sentCount: 100,
    deliveredCount: 92,
    inboundReplyCount: 11,
    reportedBookingCount: 4,
  },
  recentCampaigns: [],
  attentionItems: [],
};

function testApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    c.set('organization', {
      id: organizationId,
      clerkOrganizationId: 'org_123',
      name: 'Retaino Test',
      slug: 'retaino-test',
      onboardingStatus: 'complete',
      role: 'org:admin',
    });
    await next();
  });
  app.route('/v1/overview', overviewRoutes);

  return app;
}

describe('overview routes', () => {
  beforeEach(() => {
    vi.mocked(getOverviewDashboard).mockReset();
  });

  it('loads the organization-scoped overview dashboard', async () => {
    vi.mocked(getOverviewDashboard).mockResolvedValue(overview);

    const response = await testApp().request('/v1/overview');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(overview);
    expect(getOverviewDashboard).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ organizationId }),
    );
  });
});
