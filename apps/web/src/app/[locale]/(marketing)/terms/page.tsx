import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocumentArticle } from '@/features/legal/components/legal-document-article';
import { fetchLatestLegalDocument } from '@/features/legal/legal';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Retaino',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const document = await fetchLatestLegalDocument('terms');

  if (!document) {
    notFound();
  }

  return <LegalDocumentArticle document={document} />;
}
