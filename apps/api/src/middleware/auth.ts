import { createClerkClient } from '@clerk/backend';
import {
  getOrganizationContext,
  upsertOrganizationByClerkId,
  upsertUserByClerkId,
} from '@retaino/db';
import { createMiddleware } from 'hono/factory';
import { apiError } from '../lib/errors';
import { parseConfiguredOrigins } from '../lib/origins';
import type { AppEnv } from '../types';

function primaryEmailAddress(emailAddresses: unknown) {
  if (!Array.isArray(emailAddresses)) {
    return null;
  }

  const firstEmail = emailAddresses[0] as { emailAddress?: unknown } | undefined;
  return typeof firstEmail?.emailAddress === 'string' ? firstEmail.emailAddress : null;
}

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const clerk = createClerkClient({
    publishableKey: c.env.CLERK_PUBLISHABLE_KEY,
    secretKey: c.env.CLERK_SECRET_KEY,
  });

  const authorizedParties = parseConfiguredOrigins(c.env.APP_ALLOWED_ORIGINS);
  const requestState = await clerk.authenticateRequest(c.req.raw, {
    acceptsToken: 'session_token',
    ...(authorizedParties.length > 0 ? { authorizedParties } : {}),
  });

  if (!requestState.isAuthenticated) {
    return c.json(apiError('unauthorized', 'Authentication is required.'), 401);
  }

  const auth = requestState.toAuth();

  if (!('userId' in auth) || typeof auth.userId !== 'string') {
    return c.json(apiError('unauthorized', 'Authenticated request is missing a user.'), 401);
  }

  if (!('orgId' in auth) || typeof auth.orgId !== 'string') {
    return c.json(
      apiError('active_organization_required', 'An active organization is required.'),
      403,
    );
  }

  const role = 'orgRole' in auth && typeof auth.orgRole === 'string' ? auth.orgRole : 'org:member';
  const db = c.get('db');
  const clerkUser = await clerk.users.getUser(auth.userId);
  const email = primaryEmailAddress(clerkUser.emailAddresses);
  const user = await upsertUserByClerkId(db, {
    clerkUserId: auth.userId,
    email,
  });

  if (!user) {
    return c.json(apiError('internal_error', 'Failed to load authenticated user.'), 500);
  }

  const clerkOrganization = await clerk.organizations.getOrganization({
    organizationId: auth.orgId,
  });
  const organization = await upsertOrganizationByClerkId(db, {
    clerkOrganizationId: auth.orgId,
    name: clerkOrganization.name,
    slug: clerkOrganization.slug ?? null,
  });

  if (!organization) {
    return c.json(apiError('internal_error', 'Failed to load active organization.'), 500);
  }

  const organizationContext = await getOrganizationContext(db, {
    clerkOrganizationId: auth.orgId,
    role,
  });

  if (!organizationContext) {
    return c.json(apiError('forbidden', 'Organization access was not found.'), 403);
  }

  c.set('auth', auth);
  c.set('user', user);
  c.set('organization', organizationContext);

  await next();
});
