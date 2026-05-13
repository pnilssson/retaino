import type { Context } from 'hono';
import { apiError } from '../../lib/errors';
import type { AppEnv } from '../../types';
import { getOrganizationSessionState } from './organization.service';

export async function requireContactImportEligibility(c: Context<AppEnv>) {
  const state = await getOrganizationSessionState(
    c.get('db'),
    c.get('organization'),
  );
  const blocker = state.eligibility.contactImports.blocker;

  if (blocker === 'admin_required') {
    return {
      ok: false as const,
      response: c.json(
        apiError('forbidden', 'Only organization admins can import contacts.'),
        403,
      ),
    };
  }

  if (blocker === 'setup_required') {
    return {
      ok: false as const,
      response: c.json(
        apiError(
          'forbidden',
          'Organization setup must be complete before importing contacts.',
        ),
        403,
      ),
    };
  }

  if (blocker === 'legal_update_required') {
    return {
      ok: false as const,
      response: c.json(
        apiError(
          'forbidden',
          'Legal agreement must be current before importing contacts.',
        ),
        403,
      ),
    };
  }

  return { ok: true as const };
}
