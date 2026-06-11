import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALES } from '@retaino/shared';

export const routing = defineRouting({
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  locales: LOCALES,
});

export type AppLocale = (typeof routing.locales)[number];
