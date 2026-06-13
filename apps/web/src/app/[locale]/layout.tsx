import type { ReactNode } from 'react';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { SkipLink } from '@/components/skip-link';
import { CookieBanner } from '@/features/cookies/cookie-banner';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const common = await getTranslations('Common');

  return (
    <NextIntlClientProvider key={locale} locale={locale}>
      <SkipLink label={common('skipToContent')} />
      {children}
      <CookieBanner />
    </NextIntlClientProvider>
  );
}
