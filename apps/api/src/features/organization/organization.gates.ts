import type { Context } from 'hono';
import { apiError } from '../../lib/errors';
import type { AppEnv } from '../../types';
import { getOrganizationSessionState } from './organization.service';

type GateMessages = {
  adminRequired: string;
  setupRequired: string;
  legalUpdateRequired: string;
};

export async function requireContactImportEligibility(c: Context<AppEnv>) {
  return requireOrganizationEligibility(c, {
    adminRequired: 'Only organization admins can import contacts.',
    setupRequired:
      'Organization setup must be complete before importing contacts.',
    legalUpdateRequired:
      'Legal agreement must be current before importing contacts.',
  });
}

export async function requireCampaignEligibility(c: Context<AppEnv>) {
  return requireOrganizationEligibility(c, {
    adminRequired: 'Only organization admins can manage campaigns.',
    setupRequired:
      'Organization setup must be complete before managing campaigns.',
    legalUpdateRequired:
      'Legal agreement must be current before managing campaigns.',
  });
}

async function requireOrganizationEligibility(
  c: Context<AppEnv>,
  messages: GateMessages,
) {
  const state = await getOrganizationSessionState(
    c.get('db'),
    c.get('organization'),
  );
  const blocker = state.eligibility.contactImports.blocker;

  if (blocker === 'admin_required') {
    return {
      ok: false as const,
      response: c.json(apiError('forbidden', messages.adminRequired), 403),
    };
  }

  if (blocker === 'setup_required') {
    return {
      ok: false as const,
      response: c.json(apiError('forbidden', messages.setupRequired), 403),
    };
  }

  if (blocker === 'legal_update_required') {
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
