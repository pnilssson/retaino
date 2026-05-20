import { getTrackingLinkByCode, recordTrackingClick } from '@retaino/db';
import { Hono } from 'hono';
import { apiError } from '../../lib/errors';
import type { AppEnv } from '../../types';

export const trackingRoutes = new Hono<AppEnv>().get('/:code', async (c) => {
  const code = c.req.param('code');

  if (
    !(await allowRedirectRequest(
      c.env?.TRACKING_REDIRECT_ROUTE_RATE_LIMITER,
      'tracking:redirect',
    ))
  ) {
    return c.json(apiError('validation_failed', 'Too many link requests.'), 429);
  }

  if (
    !(await allowRedirectRequest(
      c.env?.TRACKING_REDIRECT_RATE_LIMITER,
      `tracking:${code}`,
    ))
  ) {
    return c.json(apiError('validation_failed', 'Too many link requests.'), 429);
  }

  const trackingLink = await getTrackingLinkByCode(c.get('db'), code);

  if (!trackingLink || !isRedirectTargetAllowed(trackingLink.targetUrl)) {
    return c.json(apiError('not_found', 'Link was not found.'), 404);
  }

  await recordTrackingClick(c.get('db'), {
    trackingLink,
    userAgent: c.req.header('user-agent') ?? null,
  });

  return c.redirect(trackingLink.targetUrl, 302);
});

async function allowRedirectRequest(
  limiter: RateLimit | undefined,
  key: string,
) {
  if (!limiter) {
    return true;
  }

  const { success } = await limiter.limit({ key });
  return success;
}

function isRedirectTargetAllowed(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
