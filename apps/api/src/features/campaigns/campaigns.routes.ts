import {
  countCampaignRecipients,
  createCampaignDraft,
  createManualBookingReport,
  deleteCampaignDraft,
  getCampaignById,
  getCampaignReport,
  listCampaigns,
  previewCampaignAudience,
  searchCampaignRecipientsForBookingReport,
  updateCampaignDraft,
} from '@retaino/db';
import { createCampaignSmsPreview } from '@retaino/shared';
import {
  campaignAudiencePreviewRequestSchema,
  createManualBookingReportSchema,
  campaignSmsPreviewRequestSchema,
  campaignSmsTestSendRequestSchema,
  createCampaignDraftSchema,
  updateCampaignDraftSchema,
} from '@retaino/shared/contracts';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import {
  BillingInsufficientCreditsError,
  BillingSubscriptionRequiredError,
} from '../billing/billing.service';
import { apiError } from '../../lib/errors';
import { parseJsonBody } from '../../lib/route-helpers';
import { SmsProviderError } from '../../lib/sms-provider';
import type { AppEnv } from '../../types';
import {
  requireCampaignEligibility,
  requireCampaignPreviewEligibility,
} from '../organization/organization.gates';
import { enqueueCampaignSendProcessing } from './campaigns.jobs';
import {
  queueCampaignSend,
  sendCampaignTestSms,
  TEST_TRACKED_BOOKING_LINK,
} from './campaigns.service';

const MANUAL_BOOKING_REPORT_BODY_LIMIT_BYTES = 32 * 1024;

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

    try {
      const result = await sendCampaignTestSms({
        db: c.get('db'),
        env: c.env,
        organizationId: c.get('organization').id,
        campaignId: c.req.param('id'),
        testPhone: parsed.data.testPhone,
      });

      if (result.status === 'not_found') {
        return c.json(apiError('not_found', 'Campaign was not found.'), 404);
      }

      if (result.status === 'incomplete') {
        return c.json(
          apiError(
            'conflict',
            'Complete the campaign message and booking link first.',
          ),
          409,
        );
      }

      if (result.status === 'invalid_phone') {
        return c.json(
          apiError('validation_failed', 'Enter a valid test phone number.'),
          400,
        );
      }

      if (result.status === 'sender_not_ready') {
        return c.json(
          apiError(
            'conflict',
            'Set up the SMS sender before sending a test SMS.',
          ),
          409,
        );
      }

      return c.json({ testSend: result.testSend });
    } catch (error) {
      return campaignSmsSendErrorResponse(c, error);
    }
  })
  .get('/:id/recipients/summary', async (c) => {
    return c.json(
      await countCampaignRecipients(c.get('db'), {
        organizationId: c.get('organization').id,
        campaignId: c.req.param('id'),
      }),
    );
  })
  .get('/:id/recipients/search', async (c) => {
    const campaign = await getCampaignById(c.get('db'), {
      organizationId: c.get('organization').id,
      campaignId: c.req.param('id'),
    });

    if (!campaign) {
      return c.json(apiError('not_found', 'Campaign was not found.'), 404);
    }

    return c.json(
      await searchCampaignRecipientsForBookingReport(c.get('db'), {
        organizationId: c.get('organization').id,
        campaignId: c.req.param('id'),
        search: c.req.query('search') ?? '',
      }),
    );
  })
  .get('/:id/report', async (c) => {
    const campaign = await getCampaignById(c.get('db'), {
      organizationId: c.get('organization').id,
      campaignId: c.req.param('id'),
    });

    if (!campaign) {
      return c.json(apiError('not_found', 'Campaign was not found.'), 404);
    }

    return c.json({
      report: await getCampaignReport(c.get('db'), {
        organizationId: c.get('organization').id,
        campaignId: c.req.param('id'),
      }),
    });
  })
  .post(
    '/:id/booking-reports',
    bodyLimit({
      maxSize: MANUAL_BOOKING_REPORT_BODY_LIMIT_BYTES,
      onError: (c) =>
        c.json(
          apiError(
            'validation_failed',
            'Booking report is too large. Save fewer bookings at a time.',
          ),
          413,
        ),
    }),
    async (c) => {
      const parsed = await parseJsonBody(
        c,
        createManualBookingReportSchema,
        'Invalid booking report.',
      );

      if (!parsed.ok) {
        return parsed.response;
      }

      const result = await createManualBookingReport(c.get('db'), {
        organizationId: c.get('organization').id,
        campaignId: c.req.param('id'),
        actorUserId: c.get('user').id,
        input: parsed.data,
        userAgent: c.req.header('user-agent') ?? null,
      });

      if (result.status === 'not_found') {
        return c.json(apiError('not_found', 'Campaign was not found.'), 404);
      }

      if (result.status === 'not_reportable') {
        return c.json(
          apiError(
            'conflict',
            'Bookings can be reported after the campaign has finished sending.',
          ),
          409,
        );
      }

      if (result.status === 'invalid_revenue') {
        return c.json(
          apiError('validation_failed', result.error, {
            rowIndex: result.rowIndex,
          }),
          400,
        );
      }

      return c.json({ bookingReport: result.report }, 201);
    },
  )
  .post('/:id/send', async (c) => {
    const gate = await requireCampaignEligibility(c);

    if (!gate.ok) {
      return gate.response;
    }

    try {
      const result = await queueCampaignSend({
        db: c.get('db'),
        env: c.env,
        organizationId: c.get('organization').id,
        campaignId: c.req.param('id'),
        userId: c.get('user').id,
        userAgent: c.req.header('user-agent') ?? null,
        enqueue: (payload) => enqueueCampaignSendProcessing(c.env, payload),
      });

      if (result.status === 'not_found') {
        return c.json(apiError('not_found', 'Campaign was not found.'), 404);
      }

      if (result.status === 'not_sendable') {
        return c.json(
          apiError('conflict', 'Only ready campaigns can be sent.'),
          409,
        );
      }

      if (result.status === 'sender_not_ready') {
        return c.json(
          apiError(
            'conflict',
            'Set up the SMS sender before sending a campaign.',
          ),
          409,
        );
      }

      if (result.status === 'incomplete') {
        return c.json(
          apiError('conflict', 'Complete the campaign before sending it.'),
          409,
        );
      }

      if (result.status === 'empty_audience') {
        return c.json(
          apiError(
            'validation_failed',
            'Choose an audience with eligible contacts.',
          ),
          400,
        );
      }

      return c.json(
        {
          campaign: result.campaign,
          recipientCount: result.recipientCount,
          sendStatus: 'queued',
        },
        202,
      );
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
      const existing = await getCampaignById(c.get('db'), {
        organizationId: c.get('organization').id,
        campaignId: c.req.param('id'),
      });

      if (existing) {
        return c.json(
          apiError('conflict', 'Only draft campaigns can be deleted.'),
          409,
        );
      }

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

function campaignSmsSendErrorResponse(
  c: Context<AppEnv>,
  error: unknown,
) {
  if (error instanceof BillingSubscriptionRequiredError) {
    return c.json(
      apiError(
        'forbidden',
        'An active subscription is required before sending SMS.',
      ),
      403,
    );
  }

  if (error instanceof BillingInsufficientCreditsError) {
    return c.json(
      apiError(
        'conflict',
        'SMS credit balance is too low.',
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
