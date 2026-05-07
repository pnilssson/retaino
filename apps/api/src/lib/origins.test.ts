import { describe, expect, it } from 'vitest';
import { allowedBrowserOrigins, parseConfiguredOrigins } from './origins';

describe('parseConfiguredOrigins', () => {
  it('trims comma-separated origins and removes blanks', () => {
    expect(parseConfiguredOrigins(' https://app.retaino.test, ,http://localhost:5173 ')).toEqual([
      'https://app.retaino.test',
      'http://localhost:5173',
    ]);
  });

  it('returns an empty list when no origins are configured', () => {
    expect(parseConfiguredOrigins(undefined)).toEqual([]);
  });
});

describe('allowedBrowserOrigins', () => {
  it('combines configured and local browser origins without duplicates', () => {
    expect(allowedBrowserOrigins('http://localhost:3000,https://app.retaino.test')).toEqual([
      'http://localhost:3000',
      'https://app.retaino.test',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    ]);
  });
});
