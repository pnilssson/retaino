import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

const privatePaths = [
  '/sv/app',
  '/sv/app/',
  '/en/app',
  '/en/app/',
  '/sv/sign-in',
  '/sv/sign-in/',
  '/en/sign-in',
  '/en/sign-in/',
  '/sv/organization',
  '/sv/organization/',
  '/en/organization',
  '/en/organization/',
];

export default function robots(): MetadataRoute.Robots {
  return {
    host: siteUrl,
    rules: {
      allow: '/',
      disallow: privatePaths,
      userAgent: '*',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
