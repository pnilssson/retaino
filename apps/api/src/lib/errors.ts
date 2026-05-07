import type { ApiError, ApiErrorCode } from '@retaino/shared/schemas';

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiError {
  return details === undefined
    ? { error: { code, message } }
    : { error: { code, message, details } };
}
