import { describe, expect, it } from 'vitest';
import { getOrganizationReadiness } from './organization.readiness';

const requiredLegalDocuments = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    documentType: 'terms',
    documentVersion: '2026-05-07',
    title: 'Retaino Terms',
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
        requiredLegalDocuments,
        acceptedDocuments: requiredLegalDocuments.map((document) => ({
          documentType: document.documentType,
          documentVersion: document.documentVersion,
        })),
      }),
    ).toEqual({
      profileComplete: true,
      complianceComplete: true,
      ready: true,
      missingAcceptanceTypes: [],
    });
  });

  it('reports missing compliance documents before enabling product workflows', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: true,
        requiredLegalDocuments,
        acceptedDocuments: [
          { documentType: 'terms', documentVersion: '2026-05-07' },
        ],
      }),
    ).toEqual({
      profileComplete: true,
      complianceComplete: false,
      ready: false,
      missingAcceptanceTypes: ['dpa'],
    });
  });

  it('keeps readiness disabled when the organization profile is missing', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: false,
        requiredLegalDocuments,
        acceptedDocuments: requiredLegalDocuments.map((document) => ({
          documentType: document.documentType,
          documentVersion: document.documentVersion,
        })),
      }),
    ).toMatchObject({
      profileComplete: false,
      complianceComplete: true,
      ready: false,
    });
  });

  it('requires the current version of each compliance document', () => {
    expect(
      getOrganizationReadiness({
        hasProfile: true,
        requiredLegalDocuments,
        acceptedDocuments: [
          { documentType: 'terms', documentVersion: '2026-01-01' },
          { documentType: 'dpa', documentVersion: '2026-05-07' },
        ],
      }),
    ).toMatchObject({
      complianceComplete: false,
      ready: false,
      missingAcceptanceTypes: ['terms'],
    });
  });
});
