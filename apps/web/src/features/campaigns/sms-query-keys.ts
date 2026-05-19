"use client";

import type { SmsSenderNumberType } from '@retaino/shared/contracts';

export const smsQueryKeys = {
  all: ['sms'] as const,
  organization: (organizationId: string) =>
    [...smsQueryKeys.all, organizationId] as const,
  sender: (organizationId: string) =>
    [...smsQueryKeys.organization(organizationId), 'sender'] as const,
  countries: (organizationId: string) =>
    [...smsQueryKeys.organization(organizationId), 'countries'] as const,
  numbers: (
    organizationId: string,
    input: { countryCode: string; numberType: SmsSenderNumberType | null },
  ) =>
    [
      ...smsQueryKeys.organization(organizationId),
      'numbers',
      {
        countryCode: input.countryCode,
        numberType: input.numberType,
      },
    ] as const,
};
