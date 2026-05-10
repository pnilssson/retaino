import {
  createOrganizationAcceptance,
  getCurrentRequiredLegalDocumentVersions,
  getOrganizationProfileByOrganizationId,
  getPublishedLegalDocumentVersion,
  listOrganizationAcceptedDocuments,
  markOrganizationOnboardingComplete,
  upsertOrganizationProfile,
} from '@retaino/db';
import {
  canManageOrganizationSetup,
  createCurrentOrganizationAcceptancesSchema,
  createOrganizationAcceptanceSchema,
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
    const acceptedDocuments = await listOrganizationAcceptedDocuments(
      db,
      organization.id,
    );
    const requiredLegalDocuments =
      await getCurrentRequiredLegalDocumentVersions(db);

    return c.json({
      user: c.get('user'),
      organization,
      profile,
      acceptedDocuments,
      requiredLegalDocuments,
      readiness: getOrganizationReadiness({
        hasProfile: profile !== null,
        onboardingStatus: organization.onboardingStatus,
        requiredLegalDocuments,
        acceptedDocuments,
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
  .post('/organization/acceptances', async (c) => {
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
      createOrganizationAcceptanceSchema,
      'Invalid organization acceptance.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const db = c.get('db');
    const legalDocumentVersion = await getPublishedLegalDocumentVersion(db, {
      documentType: parsed.data.documentType,
      documentVersion: parsed.data.documentVersion,
    });
    const currentRequiredDocuments =
      await getCurrentRequiredLegalDocumentVersions(db);
    const isCurrentRequiredVersion = currentRequiredDocuments.some(
      (document) =>
        document.documentType === parsed.data.documentType &&
        document.documentVersion === parsed.data.documentVersion,
    );

    if (!legalDocumentVersion || !isCurrentRequiredVersion) {
      return c.json(
        apiError(
          'validation_failed',
          'Document version is not current for the selected document type.',
        ),
        400,
      );
    }

    const acceptance = await createOrganizationAcceptance(c.get('db'), {
      organizationId: organization.id,
      userId: c.get('user').id,
      legalDocumentVersion,
      ipAddress: c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? null,
      userAgent: c.req.header('user-agent') ?? null,
    });

    return c.json({ acceptance }, 201);
  })
  .post('/organization/acceptances/current', async (c) => {
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
      createCurrentOrganizationAcceptancesSchema,
      'Invalid organization acceptances.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const db = c.get('db');
    const user = c.get('user');
    const currentRequiredDocuments =
      await getCurrentRequiredLegalDocumentVersions(db);
    const submittedDocuments = new Map(
      parsed.data.documents.map((document) => [
        `${document.documentType}:${document.documentVersion}`,
        document,
      ]),
    );
    const hasDuplicateSubmission =
      submittedDocuments.size !== parsed.data.documents.length;
    const hasAllCurrentDocuments =
      submittedDocuments.size === currentRequiredDocuments.length &&
      currentRequiredDocuments.every((document) =>
        submittedDocuments.has(
          `${document.documentType}:${document.documentVersion}`,
        ),
      );

    if (hasDuplicateSubmission || !hasAllCurrentDocuments) {
      return c.json(
        apiError(
          'validation_failed',
          'All current required legal documents must be accepted together.',
        ),
        400,
      );
    }

    const ipAddress =
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for') ??
      null;
    const userAgent = c.req.header('user-agent') ?? null;

    for (const legalDocumentVersion of currentRequiredDocuments) {
      await createOrganizationAcceptance(db, {
        organizationId: organization.id,
        userId: user.id,
        legalDocumentVersion,
        ipAddress,
        userAgent,
      });
    }

    const completedOrganization = await markOrganizationOnboardingComplete(
      db,
      organization.id,
    );
    const acceptedDocuments = await listOrganizationAcceptedDocuments(
      db,
      organization.id,
    );
    const profile = await getOrganizationProfileByOrganizationId(
      db,
      organization.id,
    );

    return c.json(
      {
        acceptedDocuments,
        readiness: getOrganizationReadiness({
          hasProfile: profile !== null,
          onboardingStatus:
            completedOrganization?.onboardingStatus ?? 'complete',
          requiredLegalDocuments: currentRequiredDocuments,
          acceptedDocuments,
        }),
      },
      201,
    );
  });
