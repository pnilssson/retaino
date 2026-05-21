import type {
  LegalBundle,
  OrganizationEligibility,
  OrganizationLegalAcceptance,
  OrganizationReadiness,
  OrganizationWorkflowBlocker,
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
    input.legalAcceptance?.bundleVersion === input.legalBundle.version &&
    input.legalAcceptance.bundleHash === input.legalBundle.hash;
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

export function getOrganizationEligibility(input: {
  readiness: OrganizationReadiness;
}): OrganizationEligibility {
  if (!input.readiness.ready) {
    return blocked('setup_required');
  }

  if (input.readiness.legalUpdatesRequired || !input.readiness.legalCurrent) {
    return blocked('legal_update_required');
  }

  return {
    contactImports: {
      allowed: true,
      blocker: null,
    },
  };
}

function blocked(blocker: OrganizationWorkflowBlocker): OrganizationEligibility {
  return {
    contactImports: {
      allowed: false,
      blocker,
    },
  };
}
