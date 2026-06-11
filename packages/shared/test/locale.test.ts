import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  LOCALES,
  isLocale,
  localeToIntlLocale,
  normalizeLocale,
} from '../src/locale';

describe('locale helpers', () => {
  it('uses Swedish as the default locale', () => {
    expect(DEFAULT_LOCALE).toBe('sv');
    expect(LOCALES).toEqual(['sv', 'en']);
  });

  it('normalizes supported locale-like values', () => {
    expect(normalizeLocale('sv-SE')).toBe('sv');
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('fr-FR')).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE);
  });

  it('maps route locales to Intl locales', () => {
    expect(localeToIntlLocale('sv')).toBe('sv-SE');
    expect(localeToIntlLocale('en')).toBe('en-US');
  });

  it('checks whether a value is a supported route locale', () => {
    expect(isLocale('sv')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('sv-SE')).toBe(false);
  });
});
