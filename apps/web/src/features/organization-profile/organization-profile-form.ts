import type {
  OrganizationSession,
  UpdateOrganizationProfileInput
} from '@retaino/shared/contracts';
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
  countryCode: 'SE'
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
    countryCode: session.profile.countryCode
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

export function validateEmail(value: string, label: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return `Enter the ${label}.`;
  }

  if (!EMAIL_PATTERN.test(normalizedValue)) {
    return 'Enter a valid email address.';
  }

  return undefined;
}

export function validateRequired(value: string, message: string) {
  return value.trim() ? undefined : message;
}

export function validateCountryCode(value: string) {
  return isSupportedCountryCode(value.trim().toUpperCase())
    ? undefined
    : 'Choose a supported country.';
}

export function validatePhone(value: string, countryCode: string) {
  if (!value.trim()) {
    return undefined;
  }

  return normalizePhoneNumber(value, countryCode).ok
    ? undefined
    : 'Enter a valid phone number.';
}
