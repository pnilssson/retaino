import { describe, expect, it } from 'vitest';
import { getOrganizationReadiness } from './organization.readiness';

const requiredLegalDocuments = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    documentType: 'terms',
    documentVersion: '2026-05-07',
    title: 'Retaino Terms and Conditions',
    effectiveDate: '2026-05-07',
    contentHash: 'a'.repeat(64),
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    documentType: 'dpa',
    documentVersion: '2026-05-07',
    title: 'Retaino Data Processing Agreement',
    effectiveDate: '2026-05-07',
    contentHash: 'b'.repeat(64),
  },
] as const;

describe('getOrganizationReadiness', () => {
  it('marks an organization ready when profile and required acceptances are complete', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: true,
        onboardingStatus: 'complete',
        requiredLegalDocuments,
        acceptedDocuments: requiredLegalDocuments.map((document) => ({
          documentType: document.documentType,
          documentVersion: document.documentVersion,
        })),
      }),
    ).toEqual({
      profileComplete: true,
      complianceComplete: true,
      setupComplete: true,
      legalUpdatesRequired: false,
      ready: true,
      missingAcceptanceTypes: [],
    });
  });

  it('reports missing compliance documents before enabling product workflows', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: true,
        onboardingStatus: 'profile_required',
        requiredLegalDocuments,
        acceptedDocuments: [
          { documentType: 'terms', documentVersion: '2026-05-07' },
        ],
      }),
    ).toEqual({
      profileComplete: true,
      complianceComplete: false,
      setupComplete: false,
      legalUpdatesRequired: false,
      ready: false,
      missingAcceptanceTypes: ['dpa'],
    });
  });

  it('keeps readiness disabled when the organization profile is missing', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: false,
        onboardingStatus: 'profile_required',
        requiredLegalDocuments,
        acceptedDocuments: requiredLegalDocuments.map((document) => ({
          documentType: document.documentType,
          documentVersion: document.documentVersion,
        })),
      }),
    ).toMatchObject({
      profileComplete: false,
      complianceComplete: true,
      setupComplete: false,
      legalUpdatesRequired: false,
      ready: false,
    });
  });

  it('requires the current version of each compliance document after setup', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: true,
        onboardingStatus: 'complete',
        requiredLegalDocuments,
        acceptedDocuments: [
          { documentType: 'terms', documentVersion: '2026-01-01' },
          { documentType: 'dpa', documentVersion: '2026-05-07' },
        ],
      }),
    ).toMatchObject({
      complianceComplete: false,
      setupComplete: true,
      legalUpdatesRequired: true,
      ready: false,
      missingAcceptanceTypes: ['terms'],
    });
  });
});
