"use client";

import { AlertCircle } from 'lucide-react';
import { appLegalDocumentUrl } from '@retaino/shared/contracts';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { complianceDocumentLabels } from '@/features/onboarding/onboarding.constants';
import { TeamInvitationSection } from './team-invitation-section';

export function OrganizationSettingsScreen() {
  const session = useOrganizationSession();

  if (session.isLoading) {
    return (
      <main className="flex flex-1 bg-background">
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <p className="text-sm text-muted-foreground">
            Loading organization settings.
          </p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <Alert className="max-w-lg" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Organization settings could not be loaded</AlertTitle>
          <AlertDescription>{session.error.message}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  const currentRequiredVersions = new Set(
    session.data.requiredLegalDocuments.map(
      (document) => `${document.documentType}:${document.documentVersion}`
    )
  );

  return (
    <main className="flex flex-1 bg-background">
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-8 sm:px-8 lg:px-10">
        <div>
          <p className="text-sm text-muted-foreground">Organization settings</p>
          <h1 className="mt-2 text-2xl leading-tight tracking-tight sm:text-3xl">
            {session.data.organization.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review accepted compliance document versions and manage team access.
          </p>
        </div>

        <section>
          <div className="max-w-2xl">
            <h2 className="text-base font-medium">Accepted documents</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Each row links to the exact document version accepted for this
              organization.
            </p>
          </div>
          <div className="mt-5 divide-y border-y">
            {session.data.acceptedDocuments.map((document) => {
              const isCurrent = currentRequiredVersions.has(
                `${document.documentType}:${document.documentVersion}`
              );
              const label =
                complianceDocumentLabels[
                  document.documentType as keyof typeof complianceDocumentLabels
                ] ?? document.documentType;

              return (
                <div
                  className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={document.legalDocumentVersionId}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{label}</p>
                      <Badge variant={isCurrent ? 'default' : 'outline'}>
                        {isCurrent ? 'Current' : 'Archived'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Version {document.documentVersion}
                    </p>
                  </div>
                  <Button asChild type="button" variant="outline">
                    <Link
                      href={appLegalDocumentUrl({
                        documentType: document.documentType,
                        documentVersion: document.documentVersion
                      })}
                    >
                      Review
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        <TeamInvitationSection session={session.data} />
      </section>
    </main>
  );
}
