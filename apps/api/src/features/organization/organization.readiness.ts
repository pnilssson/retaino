import type {
  LegalBundle,
  OrganizationLegalAcceptance,
  OrganizationReadiness,
} from '@retaino/shared/contracts';

export function getOrganizationReadiness(input: {
  hasProfile: boolean;
  onboardingStatus: string;
  legalBundle: Pick<LegalBundle, 'version' | 'hash'>;
  legalAcceptance: Pick<
    OrganizationLegalAcceptance,
    'bundleVersion' | 'bundleHash'
  > | null;
}): OrganizationReadiness {
  const legalCurrent =
    input.legalAcceptance?.bundleVersion === input.legalBundle.version;
  const setupComplete = input.onboardingStatus === 'complete';
  const legalUpdatesRequired = setupComplete && !legalCurrent;

  return {
    profileComplete: input.hasProfile,
    legalCurrent,
    setupComplete,
    legalUpdatesRequired,
    ready: input.hasProfile && setupComplete,
  };
}
