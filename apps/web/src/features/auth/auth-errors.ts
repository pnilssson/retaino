import type {
  AuthError,
  AuthField,
} from '@/features/auth/types';

type ClerkFieldError = {
  code?: string;
  message?: string;
  longMessage?: string;
};

type ClerkErrorLike = {
  errors?: ClerkFieldError[];
  message?: string;
};

const fallbackMessage =
  'We could not complete that step. Check the details and try again.';

const fieldByCode: Record<string, AuthField> = {
  form_code_incorrect: 'code',
  form_identifier_invalid: 'email',
  form_identifier_not_found: 'email',
  form_param_format_invalid: 'email',
  verification_failed: 'code'
};

export function getAuthError(
  error: unknown,
  fallbackField: AuthField
): AuthError {
  if (isClerkErrorLike(error)) {
    const first = error.errors?.[0];

    if (first) {
      return {
        field: first.code ? fieldByCode[first.code] ?? fallbackField : fallbackField,
        message: first.longMessage ?? first.message ?? fallbackMessage
      };
    }

    if (error.message) {
      return {
        field: fallbackField,
        message: error.message
      };
    }
  }

  return {
    field: fallbackField,
    message: fallbackMessage
  };
}

export function hasClerkErrorCode(error: unknown, code: string) {
  return isClerkErrorLike(error) && error.errors?.[0]?.code === code;
}

function isClerkErrorLike(error: unknown): error is ClerkErrorLike {
  return typeof error === 'object' && error !== null;
}
