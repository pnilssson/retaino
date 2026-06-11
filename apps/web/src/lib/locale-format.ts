import {
  DEFAULT_LOCALE,
  isLocale,
  localeToIntlLocale,
} from '@retaino/shared';

export function getIntlLocale(locale?: string | null) {
  return localeToIntlLocale(isLocale(locale) ? locale : DEFAULT_LOCALE);
}
