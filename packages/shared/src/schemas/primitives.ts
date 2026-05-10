import { z } from 'zod';

export const idSchema = z.string().uuid();
export const timestampSchema = z.iso.datetime({ offset: true });
export const nonEmptyStringSchema = z.string().trim().min(1);
