import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { normalizeLocale } from '@retaino/shared';
import {
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { HeroSection } from '@/features/marketing/components/hero-section';
import { HowItWorksSection } from '@/features/marketing/components/how-it-works-section';
import { routes } from '@/lib/routes';
import { buildPublicPageMetadata } from '@/lib/seo';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const normalizedLocale = normalizeLocale(locale);

  setRequestLocale(normalizedLocale);

  const t = await getTranslations('Metadata');

  return buildPublicPageMetadata({
    description: t('homeDescription'),
    locale: normalizedLocale,
    path: routes.home,
    title: t('homeTitle'),
  });
}

export default async function HomePage({
  params,
}: HomePageProps) {
  const { locale } = await params;
  const normalizedLocale = normalizeLocale(locale);

  setRequestLocale(normalizedLocale);

  const { isAuthenticated } = await auth({
    treatPendingAsSignedOut: false
  });

  if (isAuthenticated) {
    redirect({ href: routes.app, locale });
  }

  return (
    <main className="flex-1" id="main-content">
      <HeroSection />
      <HowItWorksSection />
    </main>
  );
}
