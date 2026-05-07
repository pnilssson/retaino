import {
  legalDocumentVersionSchema,
  type LegalDocumentVersion,
} from '@retaino/shared/contracts';

type LegalDocumentResponse = {
  legalDocument: LegalDocumentVersion;
};

export async function fetchLatestLegalDocument(documentType: string) {
  return fetchLegalDocument(`/v1/legal/${documentType}`);
}

export async function fetchLegalDocumentVersion(input: {
  documentType: string;
  documentVersion: string;
}) {
  return fetchLegalDocument(
    `/v1/legal/${input.documentType}/${input.documentVersion}`,
  );
}

async function fetchLegalDocument(path: string) {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Legal document could not be loaded.');
  }

  const payload = (await response.json()) as LegalDocumentResponse;

  return legalDocumentVersionSchema.parse(payload.legalDocument);
}

function apiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  }

  return baseUrl.replace(/\/+$/, '');
}
