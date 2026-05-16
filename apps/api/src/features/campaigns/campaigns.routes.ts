import {
  createCampaignDraft,
  deleteCampaignDraft,
  getCampaignById,
  listCampaigns,
  previewCampaignAudience,
  updateCampaignDraft,
} from '@retaino/db';
import {
  campaignAudiencePreviewRequestSchema,
  createCampaignDraftSchema,
  updateCampaignDraftSchema,
} from '@retaino/shared/contracts';
import { Hono } from 'hono';
import { apiError } from '../../lib/errors';
import { parseJsonBody } from '../../lib/route-helpers';
import type { AppEnv } from '../../types';
import {
  requireCampaignEligibility,
  requireCampaignPreviewEligibility,
} from '../organization/organization.gates';

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
