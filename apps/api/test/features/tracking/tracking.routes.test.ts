import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTrackingLinkByCode, recordTrackingClick } from '@retaino/db';
import { trackingRoutes } from '../../../src/features/tracking/tracking.routes';
import type { AppEnv } from '../../../src/types';

vi.mock('@retaino/db', () => ({
  getTrackingLinkByCode: vi.fn(),
  recordTrackingClick: vi.fn(),
}));

const trackingLink = {
  id: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  campaignId: '33333333-3333-4333-8333-333333333333',
  recipientId: '44444444-4444-4444-8444-444444444444',
  code: 'abc123',
  targetUrl: 'https://booking.example.com/studio',
  phoneHash: 'phone-hash',
  emailHash: null,
  firstClickedAt: null,
  lastClickedAt: null,
  clickCount: 0,
  createdAt: '2026-05-16T10:00:00.000Z',
  updatedAt: '2026-05-16T10:00:00.000Z',
};

function testApp() {
  const app = new Hono<AppEnv>();

  app.use('*', async (c, next) => {
    c.set('db', {} as never);
    await next();
  });
  app.route('/r', trackingRoutes);
  return app;
}

describe('trackingRoutes', () => {
  beforeEach(() => {
    vi.mocked(getTrackingLinkByCode).mockReset();
    vi.mocked(recordTrackingClick).mockReset();
  });

  it('resolves a public tracking code, records a click, and redirects', async () => {
    vi.mocked(getTrackingLinkByCode).mockResolvedValue(trackingLink);
    vi.mocked(recordTrackingClick).mockResolvedValue({
      id: '55555555-5555-4555-8555-555555555555',
      organizationId: trackingLink.organizationId,
      campaignId: trackingLink.campaignId,
      recipientId: trackingLink.recipientId,
      trackingLinkId: trackingLink.id,
      userAgent: 'Mozilla/5.0',
      ipAddress: '203.0.113.10',
      occurredAt: '2026-05-16T10:02:00.000Z',
      createdAt: '2026-05-16T10:02:00.000Z',
    });

    const response = await testApp().request('/r/abc123', {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'cf-connecting-ip': '203.0.113.10',
      },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(trackingLink.targetUrl);
    expect(getTrackingLinkByCode).toHaveBeenCalledWith(expect.anything(), 'abc123');
    expect(recordTrackingClick).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        trackingLink,
        userAgent: 'Mozilla/5.0',
        ipAddress: '203.0.113.10',
      }),
    );
  });

  it('returns not found for unknown tracking codes', async () => {
    vi.mocked(getTrackingLinkByCode).mockResolvedValue(null);

    const response = await testApp().request('/r/missing');

    expect(response.status).toBe(404);
    expect(recordTrackingClick).not.toHaveBeenCalled();
  });
});
