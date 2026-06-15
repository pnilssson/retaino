import type { Metadata } from 'next';
import {
  DEFAULT_LOCALE,
  LOCALES,
  localeToIntlLocale,
  type Locale,
} from '@retaino/shared';

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://retaino.io'
).replace(/\/$/, '');

const defaultImagePath = '/brand/social/retaino-og.png';

export function buildLocalizedSeoPath(path: string, locale: Locale) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (normalizedPath === '/') {
    return `/${locale}`;
  }

  return `/${locale}${normalizedPath}`;
}

export function buildCanonicalUrl(path: string, locale: Locale) {
  return new URL(buildLocalizedSeoPath(path, locale), siteUrl).toString();
}

export function buildLanguageAlternates(path: string) {
  const languages = Object.fromEntries(
    LOCALES.map((locale) => [locale, buildCanonicalUrl(path, locale)]),
  ) as Record<Locale, string>;

  return {
    ...languages,
    'x-default': buildCanonicalUrl(path, DEFAULT_LOCALE),
  };
}

export function buildPublicPageMetadata({
  description,
  locale,
  path,
  title,
}: {
  description: string;
  locale: Locale;
  path: string;
  title: string;
}): Metadata {
  const canonical = buildCanonicalUrl(path, locale);
  const imageUrl = new URL(defaultImagePath, siteUrl).toString();

  return {
    alternates: {
      canonical,
      languages: buildLanguageAlternates(path),
    },
    description,
    openGraph: {
      description,
      images: [
        {
          alt: title,
          url: imageUrl,
        },
      ],
      locale: localeToIntlLocale(locale).replace('-', '_'),
      siteName: 'Retaino',
      title,
      type: 'website',
      url: canonical,
    },
    robots: {
      follow: true,
      index: true,
    },
    title,
    twitter: {
      card: 'summary_large_image',
      description,
      images: [imageUrl],
      title,
    },
  };
}

export function buildNoIndexMetadata(): Metadata {
  return {
    robots: {
      follow: false,
      googleBot: {
        follow: false,
        index: false,
      },
      index: false,
    },
  };
}
