import { describe, expect, it } from 'vitest';
import {
  currencyCodeSchema,
  formatMinorCurrencyAmount,
  parseMajorCurrencyAmount,
} from '../src';

describe('money helpers', () => {
  it('normalizes valid ISO currency codes', () => {
    expect(currencyCodeSchema.parse('sek')).toBe('SEK');
    expect(currencyCodeSchema.parse(' usd ')).toBe('USD');
  });

  it('parses user-entered SEK amounts into minor units', () => {
    expect(parseMajorCurrencyAmount('1250', 'SEK')).toEqual({
      ok: true,
      value: 125000,
    });
    expect(parseMajorCurrencyAmount('1 250', 'SEK')).toEqual({
      ok: true,
      value: 125000,
    });
    expect(parseMajorCurrencyAmount('1250,50', 'SEK')).toEqual({
      ok: true,
      value: 125050,
    });
    expect(parseMajorCurrencyAmount('1250.50', 'SEK')).toEqual({
      ok: true,
      value: 125050,
    });
  });

  it('rejects invalid and negative amounts', () => {
    expect(parseMajorCurrencyAmount('', 'SEK').ok).toBe(false);
    expect(parseMajorCurrencyAmount('-1', 'SEK').ok).toBe(false);
    expect(parseMajorCurrencyAmount('12.345', 'SEK').ok).toBe(false);
    expect(parseMajorCurrencyAmount('abc', 'SEK').ok).toBe(false);
  });

  it('formats stored minor units as currency', () => {
    expect(formatMinorCurrencyAmount(125050, 'SEK', 'sv-SE')).toBe(
      '1 250,50 kr',
    );
  });
});
