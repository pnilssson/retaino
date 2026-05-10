import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocumentArticle } from '@/features/legal/components/legal-document-article';
import { fetchLatestLegalDocument } from '@/features/legal/legal';

export const metadata: Metadata = {
  title: 'Cookie Policy | Retaino',
  robots: { index: false },
};

export default async function CookiePolicyPage() {
  const document = await fetchLatestLegalDocument('cookies');

  if (!document) {
    notFound();
  }

  return <LegalDocumentArticle document={document} />;
}
