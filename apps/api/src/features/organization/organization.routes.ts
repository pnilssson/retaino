import {
  createOrganizationLegalAcceptance,
  getCurrentLegalBundle,
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
import {
  getOrganizationEligibility,
  getOrganizationReadiness,
} from './organization.readiness';
import { getOrganizationSessionState } from './organization.service';

export const organizationRoutes = new Hono<AppEnv>()
  .get('/me', async (c) => {
    const state = await getOrganizationSessionState(
      c.get('db'),
      c.get('organization'),
    );

    return c.json({
      user: c.get('user'),
      organization: c.get('organization'),
      profile: state.profile,
      legalBundle: state.legalBundle,
      legalAcceptance: state.legalAcceptance,
      eligibility: state.eligibility,
      readiness: state.readiness,
    });
  })
  .post('/profile', async (c) => {
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
  .post('/legal', async (c) => {
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

    const ipAddress = c.req.header('cf-connecting-ip') ?? null;
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
    const readiness = getOrganizationReadiness({
      hasProfile: profile !== null,
      onboardingStatus:
        completedOrganization?.onboardingStatus ?? 'complete',
      legalBundle,
      legalAcceptance,
    });

    return c.json(
      {
        legalAcceptance,
        eligibility: getOrganizationEligibility({
          readiness,
          role: organization.role,
        }),
        readiness,
      },
      201,
    );
  });
