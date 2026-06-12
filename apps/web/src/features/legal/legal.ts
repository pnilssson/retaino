import {
  legalDocumentVersionSchema,
  type LegalDocumentVersion,
} from '@retaino/shared/contracts';
import {
  getLocale,
  getTranslations,
} from 'next-intl/server';
import {
  ApiClientError,
  fetchPublicApi,
} from '@/lib/api-client';

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
  let payload: LegalDocumentResponse;
  const locale = await getLocale();
  const t = await getTranslations('Legal');

  try {
    payload = await fetchPublicApi<LegalDocumentResponse>(path, {
      cache: 'no-store',
      headers: {
        'x-retaino-locale': locale,
      },
    });
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw new Error(t('documentLoadError'));
  }

  return legalDocumentVersionSchema.parse(payload.legalDocument);
}
