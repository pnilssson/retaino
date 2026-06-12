export const LOCALES = ['sv', 'en'] as const;
export const DEFAULT_LOCALE = 'sv' satisfies Locale;

export type Locale = (typeof LOCALES)[number];

const intlLocales = {
  en: 'en-US',
  sv: 'sv-SE',
} as const satisfies Record<Locale, string>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: unknown): Locale {
  if (typeof value !== 'string') {
    return DEFAULT_LOCALE;
  }

  const normalized = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

export function localeToIntlLocale(locale: Locale) {
  return intlLocales[locale];
}

export function buildLocalizedPath(path: string, locale: Locale) {
  const [pathname = '/', query = ''] = path.split('?', 2);
  const segments = pathname.split('/').filter(Boolean);
  const pathSegments = [...segments];

  while (isLocale(pathSegments[0])) {
    pathSegments.shift();
  }

  const localizedSegments =
    pathSegments.length > 0 ? [locale, ...pathSegments] : [locale];
  const localizedPath = `/${localizedSegments.join('/')}`;

  return query ? `${localizedPath}?${query}` : localizedPath;
}
