import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocumentArticle } from '@/features/legal/components/legal-document-article';
import { fetchLegalDocumentVersion } from '@/features/legal/legal';
import { routes } from '@/lib/routes';

type AppLegalDocumentPageProps = {
  params: Promise<{
    type: string;
    version: string;
  }>;
};

export async function generateMetadata({
  params,
}: AppLegalDocumentPageProps): Promise<Metadata> {
  const { type, version } = await params;
  const document = await fetchLegalDocumentVersion({
    documentType: type,
    documentVersion: version,
  });

  return {
    title: document ? `${document.title} | Retaino` : 'Legal document | Retaino',
    robots: { index: false },
  };
}

export default async function AppLegalDocumentPage({
  params,
}: AppLegalDocumentPageProps) {
  const { type, version } = await params;
  const document = await fetchLegalDocumentVersion({
    documentType: type,
    documentVersion: version,
  });

  if (!document) {
    notFound();
  }

  return (
    <LegalDocumentArticle
      backHref={routes.settings}
      backLabel="Back to organization"
      document={document}
    />
  );
}
