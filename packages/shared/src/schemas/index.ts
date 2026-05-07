import { z } from 'zod';

export const idSchema = z.string().uuid();
export const timestampSchema = z.string().min(1);
export const nonEmptyStringSchema = z.string().trim().min(1);

export const apiErrorCodeSchema = z.enum([
  'active_organization_required',
  'forbidden',
  'internal_error',
  'not_found',
  'unauthorized',
  'validation_failed',
]);

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: nonEmptyStringSchema,
    details: z.unknown().optional(),
  }),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
