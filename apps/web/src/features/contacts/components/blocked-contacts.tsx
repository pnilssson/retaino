import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import {
  canManageOrganizationSetup,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { routes } from '@/lib/routes';

export function BlockedContacts({ session }: { session: OrganizationSession }) {
  const canManageSetup = canManageOrganizationSetup(session.organization.role);
  const blocker = session.eligibility.contactImports.blocker;
  const adminRequired = blocker === 'admin_required';
  const legalUpdateRequired = blocker === 'legal_update_required';
  const title = adminRequired
    ? 'Admin access required for contact imports'
    : legalUpdateRequired
      ? 'Legal updates required before importing contacts'
      : 'Finish setup before importing contacts';
  const description = adminRequired
    ? 'Only organization admins can upload and process customer contact data.'
    : legalUpdateRequired
      ? 'Updated legal terms must be accepted before contact data can be imported.'
      : 'Company profile and legal agreement acceptance are required before contact data can be imported.';
  const alertTitle = adminRequired
    ? 'Contact imports require admin access'
    : legalUpdateRequired
      ? 'Contact imports are paused'
      : 'Contacts are blocked';
  const alertDescription = adminRequired
    ? 'Ask an organization admin to upload the CSV or update your organization role before importing contacts.'
    : legalUpdateRequired
      ? canManageSetup
        ? 'Review and accept the updated legal terms in organization settings to resume CSV uploads and imports.'
        : 'An organization admin needs to accept the updated legal terms before CSV uploads and imports can continue.'
      : 'Complete organization setup to unlock CSV uploads, validation, dedupe, suppression checks, and contact status.';
  const actionHref = adminRequired
    ? routes.contacts
    : legalUpdateRequired
      ? `${routes.settings}#legal-agreement`
      : routes.organizationSetup;
  const actionLabel = adminRequired
    ? 'Back to contacts'
    : legalUpdateRequired
      ? canManageSetup
        ? 'Review legal updates'
        : 'View legal'
    : 'Finish setup';

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-5xl content-start gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <AppPageHeader
          badge={
            <Badge variant="outline">
              {adminRequired
                ? 'Admin required'
                : legalUpdateRequired
                  ? 'Legal updates required'
                  : 'Setup required'}
            </Badge>
          }
          description={description}
          eyebrow="Contacts"
          title={title}
        />
        <AppPageContent>
          <AppPageItem asChild>
            <section>
              <Alert>
                <AlertCircle aria-hidden="true" />
                <AlertTitle>{alertTitle}</AlertTitle>
                <AlertDescription>{alertDescription}</AlertDescription>
              </Alert>
              <div className="flex justify-end">
                <Button asChild>
                  <Link href={actionHref}>{actionLabel}</Link>
                </Button>
              </div>
            </section>
          </AppPageItem>
        </AppPageContent>
      </section>
    </main>
  );
}
