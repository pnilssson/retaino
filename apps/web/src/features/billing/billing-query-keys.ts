"use client";

export const billingQueryKeys = {
  all: ['billing'] as const,
  organization: (organizationId: string) =>
    [...billingQueryKeys.all, organizationId] as const,
  status: (organizationId: string) =>
    [...billingQueryKeys.organization(organizationId), 'status'] as const,
};
