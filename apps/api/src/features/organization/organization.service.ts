import {
  getCurrentLegalBundle,
  getCurrentOrganizationLegalAcceptance,
  getOrganizationProfileByOrganizationId,
  type DbClient,
} from '@retaino/db';
import type {
  LegalBundle,
  OrganizationContext,
  OrganizationEligibility,
  OrganizationLegalAcceptance,
  OrganizationProfile,
  OrganizationReadiness,
} from '@retaino/shared/contracts';
import {
  getOrganizationEligibility,
  getOrganizationReadiness,
} from './organization.readiness';

export type OrganizationSessionState = {
  profile: OrganizationProfile | null;
  legalBundle: LegalBundle;
  legalAcceptance: OrganizationLegalAcceptance | null;
  readiness: OrganizationReadiness;
  eligibility: OrganizationEligibility;
};

export async function getOrganizationSessionState(
  db: DbClient,
  organization: OrganizationContext,
): Promise<OrganizationSessionState> {
  const profile = await getOrganizationProfileByOrganizationId(
    db,
    organization.id,
  );
  const legalBundle = await getCurrentLegalBundle(db);
  const legalAcceptance = await getCurrentOrganizationLegalAcceptance(db, {
    organizationId: organization.id,
    bundleVersion: legalBundle.version,
  });
  const readiness = getOrganizationReadiness({
    hasProfile: profile !== null,
    onboardingStatus: organization.onboardingStatus,
    legalBundle,
    legalAcceptance,
  });

  return {
    profile,
    legalBundle,
    legalAcceptance,
    readiness,
    eligibility: getOrganizationEligibility({
      readiness,
      role: organization.role,
    }),
  };
}
