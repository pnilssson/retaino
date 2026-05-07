import { z } from 'zod';
import { REQUIRED_LEGAL_DOCUMENT_TYPES } from '@retaino/shared/contracts';

export const updateOrganizationProfileSchema = z.object({
  legalName: z.string().trim().min(1),
  registrationNumber: z.string().trim().min(1),
  billingEmail: z.email(),
  responsibleName: z.string().trim().min(1),
  responsibleEmail: z.email(),
  responsiblePhone: z.string().trim().min(1).optional(),
});

export const createOrganizationAcceptanceSchema = z.object({
  documentType: z.enum(REQUIRED_LEGAL_DOCUMENT_TYPES),
  documentVersion: z.string().trim().min(1),
});

export const createCurrentOrganizationAcceptancesSchema = z.object({
  documents: z
    .array(createOrganizationAcceptanceSchema)
    .min(1, 'At least one legal document is required.'),
});

export type UpdateOrganizationProfileInput = z.infer<typeof updateOrganizationProfileSchema>;
export type CreateOrganizationAcceptanceInput = z.infer<typeof createOrganizationAcceptanceSchema>;
export type CreateCurrentOrganizationAcceptancesInput = z.infer<
  typeof createCurrentOrganizationAcceptancesSchema
>;
