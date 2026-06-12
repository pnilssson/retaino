import type {
  OrganizationSession,
  UpdateOrganizationProfileInput,
} from '@retaino/shared/contracts';
import { currencyCodeSchema } from '@retaino/shared';
import {
  isSupportedCountryCode,
  normalizePhoneNumber,
} from '@retaino/shared/contracts';

export type OrganizationProfileFormValues =
  Required<UpdateOrganizationProfileInput>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emptyOrganizationProfileFormValues: OrganizationProfileFormValues = {
  legalName: '',
  registrationNumber: '',
  billingEmail: '',
  responsibleName: '',
  responsibleEmail: '',
  responsiblePhone: '',
  countryCode: 'SE',
  currency: 'SEK'
};

export function organizationProfileFormValuesFromSession(
  session: OrganizationSession
): OrganizationProfileFormValues {
  if (!session.profile) {
    return emptyOrganizationProfileFormValues;
  }

  return {
    legalName: session.profile.legalName,
    registrationNumber: session.profile.registrationNumber,
    billingEmail: session.profile.billingEmail,
    responsibleName: session.profile.responsibleName,
    responsibleEmail: session.profile.responsibleEmail,
    responsiblePhone: session.profile.responsiblePhone ?? '',
    countryCode: session.profile.countryCode,
    currency: session.profile.currency
  };
}

export function organizationProfileFormValuesToUpdateInput(
  value: OrganizationProfileFormValues
): UpdateOrganizationProfileInput {
  return {
    ...value,
    responsiblePhone: value.responsiblePhone.trim() || undefined
  };
}

export function validateEmail(
  value: string,
  requiredMessage: string,
  invalidMessage: string,
) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return requiredMessage;
  }

  if (!EMAIL_PATTERN.test(normalizedValue)) {
    return invalidMessage;
  }

  return undefined;
}

export function validateRequired(value: string, message: string) {
  return value.trim() ? undefined : message;
}

export function validateCountryCode(value: string, message: string) {
  return isSupportedCountryCode(value.trim().toUpperCase())
    ? undefined
    : message;
}

export function validateCurrencyCode(value: string, message: string) {
  return currencyCodeSchema.safeParse(value).success
    ? undefined
    : message;
}

export function validatePhone(
  value: string,
  countryCode: string,
  message: string,
) {
  if (!value.trim()) {
    return undefined;
  }

  return normalizePhoneNumber(value, countryCode).ok
    ? undefined
    : message;
}
