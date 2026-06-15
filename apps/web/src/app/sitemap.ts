import type { MetadataRoute } from 'next';
import { LOCALES } from '@retaino/shared';
import {
  buildCanonicalUrl,
  buildLanguageAlternates,
} from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return LOCALES.map((locale) => ({
    alternates: {
      languages: buildLanguageAlternates('/'),
    },
    changeFrequency: 'weekly',
    lastModified,
    priority: locale === 'sv' ? 1 : 0.8,
    url: buildCanonicalUrl('/', locale),
  }));
}
