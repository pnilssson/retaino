import {
  createCampaignDraft,
  deleteCampaignDraft,
  getCampaignById,
  getOrganizationProfileByOrganizationId,
  getOrganizationSmsSender,
  listCampaigns,
  previewCampaignAudience,
  updateCampaignDraft,
} from '@retaino/db';
import { createCampaignSmsPreview, renderCampaignSms } from '@retaino/shared';
import {
  campaignAudiencePreviewRequestSchema,
  campaignSmsPreviewRequestSchema,
  campaignSmsTestSendRequestSchema,
  createCampaignDraftSchema,
  normalizePhoneNumber,
  updateCampaignDraftSchema,
} from '@retaino/shared/contracts';
import { Hono, type Context } from 'hono';
import {
  BillingInsufficientCreditsError,
  BillingSubscriptionRequiredError,
  debitSmsCreditUsage,
  releaseSmsCreditUsage,
} from '../billing/billing.service';
import { apiError } from '../../lib/errors';
import { parseJsonBody } from '../../lib/route-helpers';
import { createSmsProvider, SmsProviderError } from '../../lib/sms-provider';
import type { AppEnv } from '../../types';
import {
  requireCampaignEligibility,
  requireCampaignPreviewEligibility,
} from '../organization/organization.gates';

const TEST_TRACKED_BOOKING_LINK = 'https://go.retaino.com/r/test';

export const campaignsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    return c.json(
      await listCampaigns(c.get('db'), {
        organizationId: c.get('organization').id,
      }),
    );
  })
  .post('/', async (c) => {
    const gate = await requireCampaignEligibility(c);

    if (!gate.ok) {
      return gate.response;
    }

    const parsed = await parseJsonBody(
      c,
      createCampaignDraftSchema,
      'Invalid campaign draft.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const campaign = await createCampaignDraft(c.get('db'), {
      organizationId: c.get('organization').id,
      createdByUserId: c.get('user').id,
      input: parsed.data,
    });

    if (!campaign) {
      return c.json(apiError('internal_error', 'Failed to create campaign.'), 500);
    }

    return c.json({ campaign }, 201);
  })
  .post('/audience-preview', async (c) => {
    const gate = await requireCampaignPreviewEligibility(c);

    if (!gate.ok) {
      return gate.response;
    }

    const parsed = await parseJsonBody(
      c,
      campaignAudiencePreviewRequestSchema,
      'Invalid audience preview request.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    return c.json(
      await previewCampaignAudience(c.get('db'), {
        organizationId: c.get('organization').id,
        audienceRule: parsed.data.audienceRule,
      }),
    );
  })
  .get('/:id/audience-preview', async (c) => {
    const gate = await requireCampaignPreviewEligibility(c);

    if (!gate.ok) {
      return gate.response;
    }

    const campaign = await getCampaignById(c.get('db'), {
      organizationId: c.get('organization').id,
      campaignId: c.req.param('id'),
    });

    if (!campaign) {
      return c.json(apiError('not_found', 'Campaign was not found.'), 404);
    }

    return c.json(
      await previewCampaignAudience(c.get('db'), {
        organizationId: c.get('organization').id,
        audienceRule: campaign.audienceRule,
      }),
    );
  })
  .post('/:id/sms/preview', async (c) => {
    const gate = await requireCampaignPreviewEligibility(c);

    if (!gate.ok) {
      return gate.response;
    }

    const parsed = await parseJsonBody(
      c,
      campaignSmsPreviewRequestSchema,
      'Invalid SMS preview request.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const campaign = await getCampaignById(c.get('db'), {
      organizationId: c.get('organization').id,
      campaignId: c.req.param('id'),
    });

    if (!campaign) {
      return c.json(apiError('not_found', 'Campaign was not found.'), 404);
    }

    const readiness = requireSmsReadyCampaign(campaign);

    if (!readiness.ok) {
      return readiness.response(c);
    }

    return c.json({
      preview: createCampaignSmsPreview({
        smsBody: readiness.smsBody,
        trackedBookingLink:
          parsed.data.trackedBookingLink ?? TEST_TRACKED_BOOKING_LINK,
      }),
    });
  })
  .post('/:id/sms/send', async (c) => {
    const gate = await requireCampaignEligibility(c);

    if (!gate.ok) {
      return gate.response;
    }

    const parsed = await parseJsonBody(
      c,
      campaignSmsTestSendRequestSchema,
      'Invalid test SMS request.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const db = c.get('db');
    const organization = c.get('organization');
    const [campaign, profile] = await Promise.all([
      getCampaignById(db, {
        organizationId: organization.id,
        campaignId: c.req.param('id'),
      }),
      getOrganizationProfileByOrganizationId(db, organization.id),
    ]);

    if (!campaign) {
      return c.json(apiError('not_found', 'Campaign was not found.'), 404);
    }

    const readiness = requireSmsReadyCampaign(campaign);

    if (!readiness.ok) {
      return readiness.response(c);
    }

    const phone = parsed.data.testPhone ?? profile?.responsiblePhone;
    const normalizedPhone = normalizePhoneNumber(
      phone,
      profile?.countryCode ?? 'SE',
    );

    if (!normalizedPhone.ok) {
      return c.json(
        apiError('validation_failed', 'Enter a valid test phone number.'),
        400,
      );
    }

    const rendered = renderCampaignSms({
      smsBody: readiness.smsBody,
      trackedBookingLink: TEST_TRACKED_BOOKING_LINK,
    });
    const messageId = crypto.randomUUID();
    const sourceId = `campaign-test:${campaign.id}:${messageId}`;

    try {
      const provider = createSmsProvider(c.env);
      const sender = await getOrganizationSmsSender(db, {
        organizationId: organization.id,
        provider: provider.name,
      });

      if (!sender || sender.status !== 'ready') {
        return c.json(
          apiError(
            'conflict',
            'Set up the SMS sender before sending a test SMS.',
          ),
          409,
        );
      }

      const reservedTransactions = await debitSmsCreditUsage({
        db,
        organizationId: organization.id,
        actualSegments: rendered.estimatedSmsPerRecipient,
        source: 'campaign_test_send',
        sourceId,
        description: 'Campaign test SMS usage',
      });
      let result;

      try {
        result = await provider.sendSms({
          retainoMessageId: messageId,
          organizationSender: sender,
          to: normalizedPhone.normalizedPhone,
          renderedBody: rendered.renderedBody,
          estimatedSegments: rendered.estimatedSmsPerRecipient,
          statusCallbackUrl: callbackUrl(
            c.env.TWILIO_STATUS_CALLBACK_BASE_URL,
            '/v1/webhooks/twilio/messaging/status',
          ),
          reference: sourceId,
        });
      } catch (error) {
        await releaseSmsCreditUsage({
          db,
          organizationId: organization.id,
          reservedTransactions,
          source: 'campaign_test_send',
          sourceId: `${sourceId}:release`,
          description: 'Campaign test SMS release',
        });

        throw error;
      }

      return c.json({
        testSend: {
          to: normalizedPhone.normalizedPhone,
          renderedBody: rendered.renderedBody,
          estimatedSmsPerRecipient: rendered.estimatedSmsPerRecipient,
          chargedCredits: rendered.estimatedSmsPerRecipient,
          status: result.normalizedStatus,
        },
      });
    } catch (error) {
      return campaignSmsSendErrorResponse(c, error);
    }
  })
  .get('/:id', async (c) => {
    const campaign = await getCampaignById(c.get('db'), {
      organizationId: c.get('organization').id,
      campaignId: c.req.param('id'),
    });

    if (!campaign) {
      return c.json(apiError('not_found', 'Campaign was not found.'), 404);
    }

    return c.json({ campaign });
  })
  .patch('/:id', async (c) => {
    const gate = await requireCampaignEligibility(c);

    if (!gate.ok) {
      return gate.response;
    }

    const parsed = await parseJsonBody(
      c,
      updateCampaignDraftSchema,
      'Invalid campaign update.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    const result = await updateCampaignDraft(c.get('db'), {
      organizationId: c.get('organization').id,
      campaignId: c.req.param('id'),
      input: parsed.data,
    });

    if (result.status === 'not_found') {
      return c.json(apiError('not_found', 'Campaign was not found.'), 404);
    }

    if (result.status === 'not_editable') {
      return c.json(
        apiError('conflict', 'Only draft campaigns can be changed.'),
        409,
      );
    }

    return c.json({ campaign: result.campaign });
  })
  .delete('/:id', async (c) => {
    const gate = await requireCampaignEligibility(c);

    if (!gate.ok) {
      return gate.response;
    }

    const deleted = await deleteCampaignDraft(c.get('db'), {
      organizationId: c.get('organization').id,
      campaignId: c.req.param('id'),
    });

    if (!deleted) {
      return c.json(apiError('not_found', 'Campaign was not found.'), 404);
    }

    return c.body(null, 204);
  });

function requireSmsReadyCampaign(campaign: {
  bookingUrl: string | null;
  smsBody: string | null;
}) {
  if (!campaign.smsBody || !campaign.bookingUrl) {
    return {
      ok: false as const,
      response: (c: Context<AppEnv>) =>
        c.json(
          apiError(
            'conflict',
            'Complete the campaign message and booking link first.',
          ),
          409,
        ),
    };
  }

  return {
    ok: true as const,
    smsBody: campaign.smsBody,
  };
}

function callbackUrl(baseUrl: string | undefined, path: string) {
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function campaignSmsSendErrorResponse(
  c: Context<AppEnv>,
  error: unknown,
) {
  if (error instanceof BillingSubscriptionRequiredError) {
    return c.json(
      apiError(
        'forbidden',
        'An active subscription is required before sending a test SMS.',
      ),
      403,
    );
  }

  if (error instanceof BillingInsufficientCreditsError) {
    return c.json(
      apiError(
        'conflict',
        'SMS credit balance is too low for this test SMS.',
        {
          balance: error.balance,
          requiredCredits: error.requiredCredits,
        },
      ),
      409,
    );
  }

  if (error instanceof SmsProviderError) {
    return c.json(apiError('internal_error', error.publicMessage), 502);
  }

  throw error;
}
