import type { OrganizationSession } from '@retaino/shared/contracts';
import { routes } from '@/lib/routes';

export function campaignsAllowed(session: OrganizationSession) {
  return (
    session.readiness.ready &&
    session.readiness.legalCurrent &&
    !session.readiness.legalUpdatesRequired
  );
}

export function campaignReadinessBlock(session: OrganizationSession) {
  const legalUpdateRequired =
    session.readiness.legalUpdatesRequired || !session.readiness.legalCurrent;

  return {
    actionHref: legalUpdateRequired ? routes.legal : routes.organizationSetup,
    actionLabel: legalUpdateRequired ? 'Review legal updates' : 'Finish setup',
    badgeLabel: legalUpdateRequired ? 'Legal updates required' : 'Setup required',
    description: legalUpdateRequired
      ? 'Updated legal terms must be accepted before campaign audiences can be previewed.'
      : 'Company profile and legal agreement acceptance are required before campaigns can be prepared.',
    title: legalUpdateRequired
      ? 'Legal updates required before campaign previews'
      : 'Finish setup before campaign work',
  };
}
