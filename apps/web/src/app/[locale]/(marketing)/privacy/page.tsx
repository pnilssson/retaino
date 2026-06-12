import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LegalDocumentArticle } from '@/features/legal/components/legal-document-article';
import { fetchLatestLegalDocument } from '@/features/legal/legal';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata');

  return {
    title: t('privacyPolicyTitle'),
    robots: { index: false },
  };
}

export default async function PrivacyPolicyPage() {
  const document = await fetchLatestLegalDocument('privacy');

  if (!document) {
    notFound();
  }

  return <LegalDocumentArticle document={document} />;
}
