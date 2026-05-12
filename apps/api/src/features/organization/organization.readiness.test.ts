import { describe, expect, it } from 'vitest';
import { getOrganizationReadiness } from './organization.readiness';

const legalBundle = {
  version: '2026-05-09',
  hash: 'f'.repeat(64),
};

describe('getOrganizationReadiness', () => {
  it('marks an organization ready when profile and required acceptances are complete', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: true,
        onboardingStatus: 'complete',
        legalBundle,
        legalAcceptance: {
          bundleVersion: '2026-05-09',
          bundleHash: legalBundle.hash,
        },
      }),
    ).toEqual({
      profileComplete: true,
      legalCurrent: true,
      setupComplete: true,
      legalUpdatesRequired: false,
      ready: true,
    });
  });

  it('reports missing legal acceptance before enabling product workflows', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: true,
        onboardingStatus: 'profile_required',
        legalBundle,
        legalAcceptance: null,
      }),
    ).toEqual({
      profileComplete: true,
      legalCurrent: false,
      setupComplete: false,
      legalUpdatesRequired: false,
      ready: false,
    });
  });

  it('keeps readiness disabled when the organization profile is missing', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: false,
        onboardingStatus: 'profile_required',
        legalBundle,
        legalAcceptance: {
          bundleVersion: '2026-05-09',
          bundleHash: legalBundle.hash,
        },
      }),
    ).toMatchObject({
      profileComplete: false,
      legalCurrent: true,
      setupComplete: false,
      legalUpdatesRequired: false,
      ready: false,
    });
  });

  it('requires the current legal bundle after setup', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: true,
        onboardingStatus: 'complete',
        legalBundle,
        legalAcceptance: {
          bundleVersion: '2026-01-01',
          bundleHash: legalBundle.hash,
        },
      }),
    ).toMatchObject({
      legalCurrent: false,
      setupComplete: true,
      legalUpdatesRequired: true,
      ready: true,
    });
  });

  it('does not require acceptance again when only the bundle hash changes', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: true,
        onboardingStatus: 'complete',
        legalBundle,
        legalAcceptance: {
          bundleVersion: legalBundle.version,
          bundleHash: '0'.repeat(64),
        },
      }),
    ).toMatchObject({
      legalCurrent: true,
      legalUpdatesRequired: false,
      ready: true,
    });
  });
});
