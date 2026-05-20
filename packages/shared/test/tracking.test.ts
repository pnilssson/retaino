import { describe, expect, it } from 'vitest';
import {
  isTrackingCode,
  TRACKING_CODE_LENGTH,
  TRACKING_CODE_PATTERN,
} from '../src/tracking';

describe('tracking helpers', () => {
  it('recognizes Retaino short link codes', () => {
    expect(TRACKING_CODE_LENGTH).toBe(16);
    expect(TRACKING_CODE_PATTERN.test('0123456789abcdef')).toBe(true);
    expect(isTrackingCode('0123456789abcdef')).toBe(true);
    expect(isTrackingCode('0123456789abcdeg')).toBe(false);
    expect(isTrackingCode('abc123')).toBe(false);
  });
});
