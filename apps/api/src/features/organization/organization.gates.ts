import type { Context } from 'hono';
import { apiError } from '../../lib/errors';
import { requestLocale } from '../../lib/locale';
import type { AppEnv } from '../../types';
import { getOrganizationSessionState } from './organization.service';

type ReadinessGateMessages = {
  setupRequired: string;
  legalUpdateRequired: string;
};

export async function requireContactImportEligibility(c: Context<AppEnv>) {
  return requireOrganizationReadiness(c, {
    setupRequired:
      'Organization setup must be complete before importing contacts.',
    legalUpdateRequired:
      'Legal agreement must be current before importing contacts.',
  });
}

export async function requireCampaignEligibility(c: Context<AppEnv>) {
  return requireOrganizationReadiness(c, {
    setupRequired:
      'Organization setup must be complete before managing campaigns.',
    legalUpdateRequired:
      'Legal agreement must be current before managing campaigns.',
  });
}

export async function requireCampaignPreviewEligibility(c: Context<AppEnv>) {
  return requireOrganizationReadiness(c, {
    setupRequired:
      'Organization setup must be complete before previewing campaigns.',
    legalUpdateRequired:
      'Legal agreement must be current before previewing campaigns.',
  });
}

async function requireOrganizationReadiness(
  c: Context<AppEnv>,
  messages: ReadinessGateMessages,
) {
  const state = await getOrganizationSessionState(
    c.get('db'),
    c.get('organization'),
    requestLocale(c),
  );

  if (!state.readiness.ready) {
    return {
      ok: false as const,
      response: c.json(
        apiError('forbidden', messages.setupRequired),
        403,
      ),
    };
  }

  if (state.readiness.legalUpdatesRequired || !state.readiness.legalCurrent) {
    return {
      ok: false as const,
      response: c.json(
        apiError('forbidden', messages.legalUpdateRequired),
        403,
      ),
    };
  }

  return { ok: true as const };
}
