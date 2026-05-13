"use client";

import {
  appLegalDocumentUrl,
  canManageOrganizationSetup,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { useForm } from '@tanstack/react-form';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useCreateCurrentOrganizationLegalAcceptance } from '@/features/onboarding/hooks/use-create-current-organization-legal-acceptance';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import {
  legalBundleDocumentDescriptions,
  legalBundleDocumentLabels,
} from '@/features/onboarding/onboarding.constants';
import { getFieldError } from '@/lib/form-errors';
import { routes } from '@/lib/routes';

export function LegalOverviewScreen() {
  const session = useOrganizationSession();

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <p className="text-sm text-muted-foreground">Loading legal terms.</p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <Alert className="max-w-lg" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Legal terms could not be loaded</AlertTitle>
          <AlertDescription>{session.error.message}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  const canManageSetup = canManageOrganizationSetup(
    session.data.organization.role,
  );
  const status = legalAgreementStatus(session.data);

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <Button asChild variant="outline">
              <Link href={routes.settings}>
                <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                Back to settings
              </Link>
            </Button>
          }
          badge={
            status ? (
              <StatusBadge label={status.label} tone={status.tone} />
            ) : undefined
          }
          description="Review the current legal bundle and accept updated terms when required."
          eyebrow="Organization settings"
          title="Legal agreement"
        />

        <AppPageContent>
          <LegalBundleSection session={session.data} />
          <LegalAcceptanceSection
            canManageSetup={canManageSetup}
            session={session.data}
          />
        </AppPageContent>
      </section>
    </main>
  );
}

function LegalBundleSection({ session }: { session: OrganizationSession }) {
  return (
    <AppPageItem asChild>
      <section>
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle className="text-base">Current bundle</ItemTitle>
            <ItemDescription className="max-w-2xl">
              These are the current documents that govern this organization.
            </ItemDescription>
          </ItemContent>
        </ItemHeader>

        <dl className="grid gap-4 py-2 text-sm sm:grid-cols-3">
          <LegalMetadata
            label="Bundle version"
            value={session.legalBundle.version}
          />
          <LegalMetadata
            label="Accepted by"
            value={session.legalAcceptance?.acceptedByEmail ?? 'Not accepted'}
          />
          <LegalMetadata
            label="Accepted at"
            value={
              session.legalAcceptance
                ? formatDateTime(session.legalAcceptance.acceptedAt)
                : 'Not accepted'
            }
          />
        </dl>

        <div className="grid gap-3">
          <h3 className="text-sm font-medium">Documents</h3>
          <ul className="grid gap-2 text-sm">
            {session.legalBundle.documents.map((document) => {
              const documentType =
                document.documentType as keyof typeof legalBundleDocumentLabels;
              const label =
                legalBundleDocumentLabels[documentType] ?? document.title;
              const description =
                legalBundleDocumentDescriptions[documentType] ??
                'Legal document included in this bundle.';

              return (
                <li
                  className="grid gap-3 border-t py-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  key={document.id}
                >
                  <div className="grid min-w-0 gap-1">
                    <p className="font-medium">{label}</p>
                    <p className="text-muted-foreground">{description}</p>
                    <p className="text-xs text-muted-foreground">
                      Version {document.documentVersion}, effective{' '}
                      {document.effectiveDate}
                    </p>
                  </div>
                  <ItemActions>
                    <Button asChild type="button" variant="outline">
                      <Link
                        href={appLegalDocumentUrl({
                          documentType: document.documentType,
                          documentVersion: document.documentVersion,
                        })}
                      >
                        <FileText aria-hidden="true" data-icon="inline-start" />
                        Read document
                      </Link>
                    </Button>
                  </ItemActions>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </AppPageItem>
  );
}

function LegalMetadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value}</dd>
    </div>
  );
}

function LegalAcceptanceSection({
  canManageSetup,
  session,
}: {
  canManageSetup: boolean;
  session: OrganizationSession;
}) {
  const createLegalAcceptance = useCreateCurrentOrganizationLegalAcceptance();
  const form = useForm({
    defaultValues: {
      authorization: false,
    },
    onSubmit: async () => {
      await createLegalAcceptance.mutateAsync();
      form.reset();
    },
  });

  if (session.readiness.legalUpdatesRequired && canManageSetup) {
    return (
      <AppPageItem asChild>
        <section>
          <ItemHeader className="items-start">
            <ItemContent className="gap-2">
              <ItemTitle className="text-base">Accept updated terms</ItemTitle>
              <ItemDescription className="max-w-2xl">
                Imports are blocked until the current legal bundle is accepted.
              </ItemDescription>
            </ItemContent>
          </ItemHeader>

          <form
            className="grid gap-4 bg-amber-50/60 py-4 dark:bg-amber-950/20"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <form.Field
              name="authorization"
              validators={{
                onBlur: ({ value }) =>
                  value
                    ? undefined
                    : 'Confirm that you are authorized to accept the updated legal terms.',
                onSubmit: ({ value }) =>
                  value
                    ? undefined
                    : 'Confirm that you are authorized to accept the updated legal terms.',
              }}
            >
              {(field) => {
                const error =
                  createLegalAcceptance.error?.message ??
                  getFieldError(field.state.meta.errors);

                return (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      aria-describedby={
                        error ? 'legal-updates-authorization-error' : undefined
                      }
                      checked={field.state.value}
                      id="legal-updates-authorization"
                      onBlur={field.handleBlur}
                      onCheckedChange={(checked) =>
                        field.handleChange(checked === true)
                      }
                    />
                    <div className="grid gap-1">
                      <Label htmlFor="legal-updates-authorization">
                        I am authorized to accept the updated legal terms for
                        this organization.
                      </Label>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Campaign sends will use the same gate when campaigns
                        launch.
                      </p>
                      {error ? (
                        <p
                          className="text-xs text-destructive"
                          id="legal-updates-authorization-error"
                        >
                          {error}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              }}
            </form.Field>
            <div className="flex justify-end">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    disabled={
                      !canSubmit ||
                      isSubmitting ||
                      createLegalAcceptance.isPending
                    }
                    type="submit"
                  >
                    {isSubmitting || createLegalAcceptance.isPending ? (
                      <Loader2
                        aria-hidden="true"
                        className="animate-spin"
                        data-icon="inline-start"
                      />
                    ) : (
                      <CheckCircle2
                        aria-hidden="true"
                        data-icon="inline-start"
                      />
                    )}
                    Accept updated terms
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        </section>
      </AppPageItem>
    );
  }

  if (session.readiness.legalUpdatesRequired) {
    return (
      <Alert>
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Admin acceptance required</AlertTitle>
        <AlertDescription>
          An organization admin needs to accept the updated legal terms before
          imports and campaigns can continue.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

function legalAgreementStatus(session: OrganizationSession) {
  if (session.readiness.legalUpdatesRequired) {
    return {
      label: 'Legal updates required',
      tone: 'amber',
    } as const;
  }

  if (session.readiness.legalCurrent) {
    return null;
  }

  return {
    label: 'Setup incomplete',
    tone: 'amber',
  } as const;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
