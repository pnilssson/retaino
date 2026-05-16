import { z } from 'zod';
import { idSchema, nonEmptyStringSchema, timestampSchema } from '../schemas';

export const CAMPAIGN_STATUSES = [
  'draft',
  'approved',
  'sending',
  'sent',
  'failed',
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);

export const CAMPAIGN_SMS_PERSONALIZATION_TOKENS = [
  'first_name',
  'last_booking_date',
] as const;

export const campaignAudienceRuleSchema = z
  .object({
    lapsedDays: z.number().int().min(30).max(365),
    includeNoBookingDate: z.boolean(),
  })
  .strict();

const campaignCodeValueSchema = z
  .string()
  .trim()
  .transform((value) => (value ? value.toUpperCase() : null))
  .nullable();

const createCampaignCodeSchema = campaignCodeValueSchema
  .optional()
  .transform((value) => value ?? null);

const bookingUrlSchema = z
  .url()
  .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
    message: 'Enter an http or https booking URL.',
  });

const smsBodySchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !hasUnsupportedSmsPersonalizationToken(value), {
    message:
      'Only {first_name} and {last_booking_date} personalization tokens are supported.',
  });

function hasUnsupportedSmsPersonalizationToken(value: string) {
  const withoutAllowedTokens = value.replace(
    /\{(first_name|last_booking_date)\}/g,
    '',
  );

  return /[{}]/.test(withoutAllowedTokens);
}

export const createCampaignDraftSchema = z
  .object({
    name: z.string().trim().min(1),
    audienceRule: campaignAudienceRuleSchema,
    smsBody: smsBodySchema,
    bookingUrl: bookingUrlSchema,
    campaignCode: createCampaignCodeSchema,
    attributionWindowDays: z.number().int().min(1).max(30).default(7),
  })
  .strict();

export const updateCampaignDraftSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    audienceRule: campaignAudienceRuleSchema.optional(),
    smsBody: smsBodySchema.optional(),
    bookingUrl: bookingUrlSchema.optional(),
    campaignCode: campaignCodeValueSchema.optional(),
    attributionWindowDays: z.number().int().min(1).max(30).optional(),
  })
  .strict();

export const campaignSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  createdByUserId: idSchema,
  name: nonEmptyStringSchema,
  status: campaignStatusSchema,
  audienceRule: campaignAudienceRuleSchema,
  smsBody: nonEmptyStringSchema,
  bookingUrl: bookingUrlSchema,
  campaignCode: nonEmptyStringSchema.nullable(),
  attributionWindowDays: z.number().int().min(1).max(30),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type CampaignAudienceRule = z.infer<typeof campaignAudienceRuleSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type CreateCampaignDraftInput = z.infer<
  typeof createCampaignDraftSchema
>;
export type UpdateCampaignDraftInput = z.infer<
  typeof updateCampaignDraftSchema
>;

export type CampaignResponse = {
  campaign: Campaign;
};

export type CampaignListResponse = {
  campaigns: Campaign[];
};
