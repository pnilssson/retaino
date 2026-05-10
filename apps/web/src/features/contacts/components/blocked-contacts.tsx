import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import {
  canManageOrganizationSetup,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { routes } from '@/lib/routes';

export function BlockedContacts({ session }: { session: OrganizationSession }) {
  const canManageSetup = canManageOrganizationSetup(session.organization.role);
  const legalUpdatesRequired = session.readiness.legalUpdatesRequired;
  const title = legalUpdatesRequired
    ? 'Legal updates required before importing contacts'
    : 'Finish setup before importing contacts';
  const description = legalUpdatesRequired
    ? 'Updated legal documents must be accepted before contact data can be imported.'
    : 'Company profile and compliance acceptance are required before contact data can be imported.';
  const alertTitle = legalUpdatesRequired
    ? 'Contact imports are paused'
    : 'Contacts are blocked';
  const alertDescription = legalUpdatesRequired
    ? canManageSetup
      ? 'Review and accept the updated legal documents in organization settings to resume CSV uploads and imports.'
      : 'An organization admin needs to accept the updated legal documents before CSV uploads and imports can continue.'
    : 'Complete organization setup to unlock CSV uploads, validation, dedupe, suppression checks, and contact status.';
  const actionHref = legalUpdatesRequired
    ? `${routes.settings}#compliance-documents`
    : routes.organizationSetup;
  const actionLabel = legalUpdatesRequired
    ? canManageSetup
      ? 'Review legal updates'
      : 'View documents'
    : 'Finish setup';

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <AppPageHeader
          badge={
            <Badge variant="outline">
              {legalUpdatesRequired ? 'Legal updates required' : 'Setup required'}
            </Badge>
          }
          description={description}
          eyebrow="Contacts"
          title={title}
        />
        <Alert>
          <AlertCircle aria-hidden="true" />
          <AlertTitle>{alertTitle}</AlertTitle>
          <AlertDescription>{alertDescription}</AlertDescription>
        </Alert>
        <div>
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
