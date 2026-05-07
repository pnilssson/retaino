import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocumentArticle } from '@/features/legal/components/legal-document-article';
import { fetchLegalDocumentVersion } from '@/features/legal/legal-documents';

export const dynamic = 'force-dynamic';

type LegalDocumentPageProps = {
  params: Promise<{
    type: string;
    version: string;
  }>;
};

export async function generateMetadata({
  params,
}: LegalDocumentPageProps): Promise<Metadata> {
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

export default async function LegalDocumentPage({
  params,
}: LegalDocumentPageProps) {
  const { type, version } = await params;
  const document = await fetchLegalDocumentVersion({
    documentType: type,
    documentVersion: version,
  });

  if (!document) {
    notFound();
  }

  return <LegalDocumentArticle document={document} />;
}
