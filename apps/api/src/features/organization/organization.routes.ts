import {
  createOrganizationLegalAcceptance,
  getCurrentLegalBundle,
  getCurrentOrganizationLegalAcceptance,
  getOrganizationProfileByOrganizationId,
  markOrganizationOnboardingComplete,
  upsertOrganizationProfile,
} from '@retaino/db';
import {
  canManageOrganizationSetup,
  createCurrentOrganizationLegalAcceptanceSchema,
  normalizePhoneNumber,
  updateOrganizationProfileSchema,
} from '@retaino/shared/contracts';
import { Hono } from 'hono';
import { apiError } from '../../lib/errors';
import { parseJsonBody } from '../../lib/route-helpers';
import type { AppEnv } from '../../types';
import { getOrganizationReadiness } from './organization.readiness';

export const organizationRoutes = new Hono<AppEnv>()
  .get('/me', async (c) => {
    const db = c.get('db');
    const organization = c.get('organization');
    const profile = await getOrganizationProfileByOrganizationId(db, organization.id);
    const legalBundle = await getCurrentLegalBundle(db);
    const legalAcceptance = await getCurrentOrganizationLegalAcceptance(db, {
      organizationId: organization.id,
      bundleVersion: legalBundle.version,
    });

    return c.json({
      user: c.get('user'),
      organization,
      profile,
      legalBundle,
      legalAcceptance,
      readiness: getOrganizationReadiness({
        hasProfile: profile !== null,
        onboardingStatus: organization.onboardingStatus,
        legalBundle,
        legalAcceptance,
      }),
    });
  })
  .post('/organization/profile', async (c) => {
    const organization = c.get('organization');

    if (!canManageOrganizationSetup(organization.role)) {
      return c.json(
        apiError(
          'forbidden',
          'Only organization admins can complete organization setup.',
        ),
        403,
      );
    }

    const parsed = await parseJsonBody(
      c,
      updateOrganizationProfileSchema,
      'Invalid organization profile.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const phone = parsed.data.responsiblePhone
      ? normalizePhoneNumber(parsed.data.responsiblePhone, parsed.data.countryCode)
      : null;
    const profile = await upsertOrganizationProfile(c.get('db'), {
      organizationId: organization.id,
      ...parsed.data,
      responsiblePhone: phone?.ok ? phone.normalizedPhone : undefined,
    });

    return c.json({ profile });
  })
  .post('/organization/legal', async (c) => {
    const organization = c.get('organization');

    if (!canManageOrganizationSetup(organization.role)) {
      return c.json(
        apiError(
          'forbidden',
          'Only organization admins can accept organization setup documents.',
        ),
        403,
      );
    }

    const parsed = await parseJsonBody(
      c,
      createCurrentOrganizationLegalAcceptanceSchema,
      'Invalid legal acceptance.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const db = c.get('db');
    const user = c.get('user');
    const legalBundle = await getCurrentLegalBundle(db);
    const profile = await getOrganizationProfileByOrganizationId(
      db,
      organization.id,
    );

    if (!profile) {
      return c.json(
        apiError(
          'forbidden',
          'Organization profile must be complete before accepting legal terms.',
        ),
        403,
      );
    }

    const ipAddress =
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for') ??
      null;
    const userAgent = c.req.header('user-agent') ?? null;

    const legalAcceptance = await createOrganizationLegalAcceptance(db, {
      organizationId: organization.id,
      userId: user.id,
      legalBundle,
      ipAddress,
      userAgent,
    });

    if (!legalAcceptance) {
      return c.json(
        apiError('internal_error', 'Failed to record legal acceptance.'),
        500,
      );
    }

    const completedOrganization = await markOrganizationOnboardingComplete(
      db,
      organization.id,
    );

    return c.json(
      {
        legalAcceptance,
        readiness: getOrganizationReadiness({
          hasProfile: profile !== null,
          onboardingStatus:
            completedOrganization?.onboardingStatus ?? 'complete',
          legalBundle,
          legalAcceptance,
        }),
      },
      201,
    );
  });
