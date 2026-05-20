import { getTrackingLinkByCode, recordTrackingClick } from '@retaino/db';
import { Hono } from 'hono';
import { apiError } from '../../lib/errors';
import type { AppEnv } from '../../types';

const REDIRECT_RATE_LIMIT_WINDOW_MS = 60_000;
const REDIRECT_RATE_LIMIT_MAX = 60;
const redirectRateLimit = new Map<string, { count: number; resetAt: number }>();

export const trackingRoutes = new Hono<AppEnv>().get('/:code', async (c) => {
  const ipAddress = clientIp(c.req.raw.headers);

  if (!allowRedirectRequest(ipAddress ?? 'unknown')) {
    return c.json(apiError('validation_failed', 'Too many link requests.'), 429);
  }

  const trackingLink = await getTrackingLinkByCode(
    c.get('db'),
    c.req.param('code'),
  );

  if (!trackingLink) {
    return c.json(apiError('not_found', 'Link was not found.'), 404);
  }

  await recordTrackingClick(c.get('db'), {
    trackingLink,
    userAgent: c.req.header('user-agent') ?? null,
    ipAddress,
  });

  return c.redirect(trackingLink.targetUrl, 302);
});

function clientIp(headers: Headers) {
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null
  );
}

function allowRedirectRequest(key: string) {
  const now = Date.now();
  const existing = redirectRateLimit.get(key);

  if (!existing || existing.resetAt <= now) {
    redirectRateLimit.set(key, {
      count: 1,
      resetAt: now + REDIRECT_RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (existing.count >= REDIRECT_RATE_LIMIT_MAX) {
    return false;
  }

  existing.count += 1;
  return true;
}
