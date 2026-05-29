import { getOverviewDashboard } from '@retaino/db';
import { overviewResponseSchema } from '@retaino/shared/contracts';
import { Hono } from 'hono';
import type { AppEnv } from '../../types';

export const overviewRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const overview = await getOverviewDashboard(c.get('db'), {
    organizationId: c.get('organization').id,
  });

  return c.json(overviewResponseSchema.parse(overview));
});
