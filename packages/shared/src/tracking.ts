export const TRACKING_CODE_LENGTH = 16;
export const TRACKING_CODE_PATTERN = /^[0-9a-f]{16}$/;

export function isTrackingCode(value: string) {
  return TRACKING_CODE_PATTERN.test(value);
}
