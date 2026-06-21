import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {};

const withNextIntl = createNextIntlPlugin();

export default withSentryConfig(withNextIntl(nextConfig), {
  org: 'corely-sentry',
  project: 'retaino-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
