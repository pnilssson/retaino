import { z } from 'zod';
import { idSchema, nonEmptyStringSchema, timestampSchema } from '../schemas';

export const SMS_SENDER_PROVIDERS = ['fake', 'twilio'] as const;
export const SMS_SENDER_STATUSES = [
  'pending',
  'ready',
  'failed',
  'manual_action_required',
] as const;
export const SMS_SENDER_NUMBER_TYPES = [
  'local',
  'mobile',
  'toll_free',
] as const;

export const CAMPAIGN_STATUSES = [
  'draft',
  'ready_to_send',
  'sending',
  'sent',
  'failed',
] as const;
export const CAMPAIGN_RECIPIENT_STATUSES = [
  'selected',
  'queued',
  'sent',
  'failed',
  'skipped',
] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];
export type CampaignRecipientStatus =
  (typeof CAMPAIGN_RECIPIENT_STATUSES)[number];
export type SmsSenderProvider = (typeof SMS_SENDER_PROVIDERS)[number];
export type SmsSenderStatus = (typeof SMS_SENDER_STATUSES)[number];
export type SmsSenderNumberType = (typeof SMS_SENDER_NUMBER_TYPES)[number];

export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export const campaignRecipientStatusSchema = z.enum(
  CAMPAIGN_RECIPIENT_STATUSES,
);
export const smsSenderProviderSchema = z.enum(SMS_SENDER_PROVIDERS);
export const smsSenderStatusSchema = z.enum(SMS_SENDER_STATUSES);
export const smsSenderNumberTypeSchema = z.enum(SMS_SENDER_NUMBER_TYPES);

export const CAMPAIGN_SMS_PERSONALIZATION_TOKENS = [
  'first_name',
  'last_booking_date',
] as const;

export const DEFAULT_CAMPAIGN_AUDIENCE_RULE = {
  lapsedDays: 90,
  includeNoBookingDate: false,
} as const;

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

const draftSmsBodySchema = smsBodySchema
  .optional()
  .nullable()
  .transform((value) => value ?? null);

const draftBookingUrlSchema = bookingUrlSchema
  .optional()
  .nullable()
  .transform((value) => value ?? null);

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
    smsBody: draftSmsBodySchema,
    bookingUrl: draftBookingUrlSchema,
    campaignCode: createCampaignCodeSchema,
    attributionWindowDays: z.number().int().min(1).max(30).default(7),
  })
  .strict();

export const updateCampaignDraftSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    audienceRule: campaignAudienceRuleSchema.optional(),
    smsBody: smsBodySchema.nullable().optional(),
    bookingUrl: bookingUrlSchema.nullable().optional(),
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
  smsBody: nonEmptyStringSchema.nullable(),
  bookingUrl: bookingUrlSchema.nullable(),
  campaignCode: nonEmptyStringSchema.nullable(),
  attributionWindowDays: z.number().int().min(1).max(30),
  readyToSendAt: timestampSchema.nullable(),
  readyToSendByUserId: idSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const campaignRecipientSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  campaignId: idSchema,
  contactId: idSchema.nullable(),
  status: campaignRecipientStatusSchema,
  exclusionReason: nonEmptyStringSchema.nullable(),
  name: nonEmptyStringSchema.nullable(),
  phone: nonEmptyStringSchema.nullable(),
  email: nonEmptyStringSchema.nullable(),
  lastBookingAt: timestampSchema.nullable(),
  lastContactedAt: timestampSchema.nullable(),
  selectedAt: timestampSchema.nullable(),
  queuedAt: timestampSchema.nullable(),
  sentAt: timestampSchema.nullable(),
  failedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const campaignAudiencePreviewRequestSchema = z
  .object({
    audienceRule: campaignAudienceRuleSchema.default(
      DEFAULT_CAMPAIGN_AUDIENCE_RULE,
    ),
  })
  .strict();

export const campaignAudiencePreviewContactSchema = z.object({
  id: idSchema,
  name: nonEmptyStringSchema.nullable(),
  phone: nonEmptyStringSchema.nullable(),
  lastBookingAt: timestampSchema.nullable(),
});

export const campaignAudiencePreviewResponseSchema = z.object({
  eligibleCount: z.number().int().nonnegative(),
  suppressedCount: z.number().int().nonnegative(),
  incompleteCount: z.number().int().nonnegative(),
  missingConsentCount: z.number().int().nonnegative(),
  sampleContacts: z.array(campaignAudiencePreviewContactSchema).max(10),
});

export const smsSenderCapabilitySchema = z
  .object({
    outboundSms: z.boolean(),
    inboundSms: z.boolean(),
    statusCallbacks: z.boolean(),
    twoWaySms: z.boolean(),
    smartEncoding: z.boolean().optional(),
  })
  .strict();

export const smsSenderCountrySchema = z
  .object({
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    label: nonEmptyStringSchema,
    supportedNumberTypes: z.array(smsSenderNumberTypeSchema).min(1),
    selfServeAvailable: z.boolean(),
  })
  .strict();

export const smsSenderOptionSchema = z
  .object({
    phoneNumber: nonEmptyStringSchema,
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    numberType: smsSenderNumberTypeSchema,
    capabilities: smsSenderCapabilitySchema,
    regulatoryRequirementSummary: nonEmptyStringSchema.nullable(),
    providerReference: nonEmptyStringSchema.nullable(),
    label: nonEmptyStringSchema,
  })
  .strict();

export const organizationSmsSenderSchema = z.object({
  id: idSchema,
  organizationId: idSchema,
  provider: smsSenderProviderSchema,
  status: smsSenderStatusSchema,
  phoneNumber: nonEmptyStringSchema.nullable(),
  countryCode: nonEmptyStringSchema.nullable(),
  numberType: smsSenderNumberTypeSchema.nullable(),
  providerMessagingServiceId: nonEmptyStringSchema.nullable(),
  providerPhoneNumberId: nonEmptyStringSchema.nullable(),
  regulatoryStatus: nonEmptyStringSchema.nullable(),
  failureReason: nonEmptyStringSchema.nullable(),
  provisionedAt: timestampSchema.nullable(),
  lastVerifiedAt: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const smsSenderCountriesResponseSchema = z.object({
  countries: z.array(smsSenderCountrySchema),
});

export const smsSenderNumbersRequestSchema = z
  .object({
    countryCode: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase()),
    numberType: smsSenderNumberTypeSchema.optional(),
  })
  .strict();

export const smsSenderNumbersResponseSchema = z.object({
  numbers: z.array(smsSenderOptionSchema),
});

export const provisionOrganizationSmsSenderSchema = z
  .object({
    selectedSender: smsSenderOptionSchema,
  })
  .strict();

export const organizationSmsSenderResponseSchema = z.object({
  sender: organizationSmsSenderSchema.nullable(),
});

export const campaignSmsPreviewRequestSchema = z
  .object({
    trackedBookingLink: z.url().optional(),
  })
  .strict();

export const campaignSmsPreviewSchema = z.object({
  renderedBody: nonEmptyStringSchema,
  smsLength: z.number().int().nonnegative(),
  estimatedSmsPerRecipient: z.number().int().nonnegative(),
  optOutText: nonEmptyStringSchema,
});

export const campaignSmsPreviewResponseSchema = z.object({
  preview: campaignSmsPreviewSchema,
});

export const campaignSmsTestSendRequestSchema = z
  .object({
    testPhone: z.string().trim().min(1).optional(),
  })
  .strict();

export const campaignSmsTestSendResponseSchema = z.object({
  testSend: z.object({
    to: nonEmptyStringSchema,
    renderedBody: nonEmptyStringSchema,
    estimatedSmsPerRecipient: z.number().int().positive(),
    chargedCredits: z.number().int().positive(),
    status: nonEmptyStringSchema,
  }),
});

export const campaignRecipientListResponseSchema = z.object({
  recipients: z.array(campaignRecipientSchema),
});

export const campaignRecipientSummaryResponseSchema = z.object({
  recipientCount: z.number().int().nonnegative(),
});

export const campaignLaunchResponseSchema = z.object({
  campaign: campaignSchema,
  recipientCount: z.number().int().nonnegative(),
});

export type CampaignAudienceRule = z.infer<typeof campaignAudienceRuleSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type CampaignRecipient = z.infer<typeof campaignRecipientSchema>;
export type CreateCampaignDraftInput = z.infer<
  typeof createCampaignDraftSchema
>;
export type UpdateCampaignDraftInput = z.infer<
  typeof updateCampaignDraftSchema
>;
export type CampaignAudiencePreviewRequest = z.infer<
  typeof campaignAudiencePreviewRequestSchema
>;
export type CampaignAudiencePreviewContact = z.infer<
  typeof campaignAudiencePreviewContactSchema
>;
export type CampaignAudiencePreviewResponse = z.infer<
  typeof campaignAudiencePreviewResponseSchema
>;
export type SmsSenderCapability = z.infer<typeof smsSenderCapabilitySchema>;
export type SmsSenderCountry = z.infer<typeof smsSenderCountrySchema>;
export type SmsSenderOption = z.infer<typeof smsSenderOptionSchema>;
export type OrganizationSmsSender = z.infer<
  typeof organizationSmsSenderSchema
>;
export type SmsSenderCountriesResponse = z.infer<
  typeof smsSenderCountriesResponseSchema
>;
export type SmsSenderNumbersRequest = z.infer<
  typeof smsSenderNumbersRequestSchema
>;
export type SmsSenderNumbersResponse = z.infer<
  typeof smsSenderNumbersResponseSchema
>;
export type ProvisionOrganizationSmsSenderInput = z.infer<
  typeof provisionOrganizationSmsSenderSchema
>;
export type OrganizationSmsSenderResponse = z.infer<
  typeof organizationSmsSenderResponseSchema
>;
export type CampaignSmsPreviewRequest = z.infer<
  typeof campaignSmsPreviewRequestSchema
>;
export type CampaignSmsPreviewResponse = z.infer<
  typeof campaignSmsPreviewResponseSchema
>;
export type CampaignSmsTestSendRequest = z.infer<
  typeof campaignSmsTestSendRequestSchema
>;
export type CampaignSmsTestSendResponse = z.infer<
  typeof campaignSmsTestSendResponseSchema
>;
export type CampaignRecipientListResponse = z.infer<
  typeof campaignRecipientListResponseSchema
>;
export type CampaignRecipientSummaryResponse = z.infer<
  typeof campaignRecipientSummaryResponseSchema
>;
export type CampaignLaunchResponse = z.infer<
  typeof campaignLaunchResponseSchema
>;

export type CampaignResponse = {
  campaign: Campaign;
};

export type CampaignListResponse = {
  campaigns: Campaign[];
};
