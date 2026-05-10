import { z } from 'zod';

import { idSchema, nonEmptyStringSchema, timestampSchema } from '../schemas';

export const userSchema = z.object({
  id: idSchema,
  clerkUserId: nonEmptyStringSchema,
  email: z.email().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type User = z.infer<typeof userSchema>;
