import { normalizeLocale } from '@retaino/shared';
import { getPathname } from './navigation';

export function localizedPathname(href: string, locale: string) {
  return getPathname({ href, locale: normalizeLocale(locale) });
}
