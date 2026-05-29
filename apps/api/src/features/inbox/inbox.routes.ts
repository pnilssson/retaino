import {
  inboxConversationListQuerySchema,
  sendInboxReplySchema,
} from '@retaino/shared/contracts';
import { Hono, type Context } from 'hono';
import {
  BillingInsufficientCreditsError,
  BillingSubscriptionRequiredError,
} from '../billing/billing.service';
import { apiError } from '../../lib/errors';
import { parseJsonBody } from '../../lib/route-helpers';
import { SmsProviderError } from '../../lib/sms-provider';
import type { AppEnv } from '../../types';
import { requireCampaignEligibility } from '../organization/organization.gates';
import {
  getInboxConversation,
  getInboxUnreadSummary,
  listInbox,
  markConversationRead,
  sendInboxReply,
} from './inbox.service';

export const inboxRoutes = new Hono<AppEnv>()
  .get('/conversations', async (c) => {
    const parsed = inboxConversationListQuerySchema.safeParse({
      activity: c.req.query('activity'),
    });

    if (!parsed.success) {
      return c.json(
        apiError(
          'validation_failed',
          'Invalid inbox filter.',
          parsed.error.flatten(),
        ),
        400,
      );
    }

    return c.json(
      await listInbox({
        db: c.get('db'),
        organizationId: c.get('organization').id,
        activity: parsed.data.activity,
      }),
    );
  })
  .get('/summary', async (c) => {
    return c.json(
      await getInboxUnreadSummary({
        db: c.get('db'),
        organizationId: c.get('organization').id,
      }),
    );
  })
  .get('/conversations/:id', async (c) => {
    const result = await getInboxConversation({
      db: c.get('db'),
      organizationId: c.get('organization').id,
      conversationId: c.req.param('id'),
    });

    if (!result) {
      return c.json(apiError('not_found', 'Conversation was not found.'), 404);
    }

    return c.json(result);
  })
  .post('/conversations/:id/read', async (c) => {
    const result = await markConversationRead({
      db: c.get('db'),
      organizationId: c.get('organization').id,
      conversationId: c.req.param('id'),
    });

    if (!result) {
      return c.json(apiError('not_found', 'Conversation was not found.'), 404);
    }

    return c.json(result);
  })
  .post('/conversations/:id/replies', async (c) => {
    const eligibility = await requireCampaignEligibility(c);

    if (!eligibility.ok) {
      return eligibility.response;
    }

    const parsed = await parseJsonBody(
      c,
      sendInboxReplySchema,
      'Invalid reply.',
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    try {
      const result = await sendInboxReply({
        db: c.get('db'),
        env: c.env,
        organizationId: c.get('organization').id,
        actorUserId: c.get('user').id,
        conversationId: c.req.param('id'),
        reply: parsed.data,
      });

      if (result.status === 'not_found') {
        return c.json(apiError('not_found', 'Conversation was not found.'), 404);
      }

      if (result.status === 'reply_blocked') {
        return c.json(
          apiError('conflict', 'This phone number cannot receive replies.'),
          409,
        );
      }

      if (result.status === 'sender_not_ready') {
        return c.json(
          apiError('conflict', 'Set up the SMS sender before replying.'),
          409,
        );
      }

      return c.json(result.response, 201);
    } catch (error) {
      return inboxReplyErrorResponse(c, error);
    }
  });

function inboxReplyErrorResponse(c: Context<AppEnv>, error: unknown) {
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
