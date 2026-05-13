import type { OrganizationSession } from '@retaino/shared/contracts';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { AppPageItem } from '@/features/appshell/components/app-page-content';
import { routes } from '@/lib/routes';

export function ComplianceSection({
  session,
}: {
  session: OrganizationSession;
}) {
  const status = legalAgreementStatus(session);

  return (
    <AppPageItem asChild>
      <section id="legal-agreement">
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle className="text-base">Legal agreement</ItemTitle>
            <ItemDescription className="max-w-2xl">
              {status.description}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button asChild type="button" variant="outline">
              <Link href={routes.legal}>
                <FileText aria-hidden="true" data-icon="inline-start" />
                View legal
              </Link>
            </Button>
          </ItemActions>
        </ItemHeader>
      </section>
    </AppPageItem>
  );
}

function legalAgreementStatus(session: OrganizationSession) {
  if (session.readiness.legalCurrent) {
    return {
      description: 'Current legal bundle accepted for this organization.',
    } as const;
  }

  if (session.readiness.legalUpdatesRequired) {
    return {
      description:
        'Updated legal terms must be accepted before imports or campaigns can continue.',
    } as const;
  }

  return {
    description: 'Legal terms must be accepted to finish organization setup.',
  } as const;
}
