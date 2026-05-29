"use client";

export const smsQueryKeys = {
  all: ['sms'] as const,
  organization: (organizationId: string) =>
    [...smsQueryKeys.all, organizationId] as const,
  sender: (organizationId: string) =>
    [...smsQueryKeys.organization(organizationId), 'sender'] as const,
  countries: (organizationId: string) =>
    [...smsQueryKeys.organization(organizationId), 'countries'] as const,
};
