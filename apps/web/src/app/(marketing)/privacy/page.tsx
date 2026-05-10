import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocumentArticle } from '@/features/legal/components/legal-document-article';
import { fetchLatestLegalDocument } from '@/features/legal/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy | Retaino',
  robots: { index: false },
};

export default async function PrivacyPolicyPage() {
  const document = await fetchLatestLegalDocument('privacy');

  if (!document) {
    notFound();
  }

  return <LegalDocumentArticle document={document} />;
}
