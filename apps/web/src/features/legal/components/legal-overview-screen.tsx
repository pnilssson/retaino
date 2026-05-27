"use client";

import {
  appLegalDocumentUrl,
  canManageOrganizationSetup,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { useForm } from '@tanstack/react-form';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { ItemNotice } from '@/components/item-notice';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ItemActions,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { AppPageLoading } from '@/features/appshell/components/app-page-loading';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { ContentSection } from '@/features/appshell/components/content-section';
import { useCreateCurrentOrganizationLegalAcceptance } from '@/features/onboarding/hooks/use-create-current-organization-legal-acceptance';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import {
  legalBundleDocumentDescriptions,
  legalBundleDocumentLabels,
} from '@/features/onboarding/onboarding.constants';
import { getFieldError } from '@/lib/form-errors';
import { routes } from '@/lib/routes';
import { textStyles } from '@/lib/text-styles';

export function LegalOverviewScreen() {
  const session = useOrganizationSession();

  if (session.isLoading) {
    return <AppPageLoading />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title="Legal terms could not be loaded"
            variant="error"
          />
        </div>
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

        <div className="grid gap-5">
          <LegalBundleSection session={session.data} />
          <LegalAcceptanceSection
            canManageSetup={canManageSetup}
            session={session.data}
          />
        </div>
      </section>
    </main>
  );
}

function LegalBundleSection({ session }: { session: OrganizationSession }) {
  return (
    <ContentSection
      description="These are the current documents that govern this organization."
      title="Current bundle"
    >
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
          <ItemTitle>Documents</ItemTitle>
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
                    <ItemTitle>{label}</ItemTitle>
                    <ItemDescription>{description}</ItemDescription>
                    <p className={textStyles.meta}>
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
    </ContentSection>
  );
}

function LegalMetadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className={textStyles.meta}>{label}</dt>
      <dd className={textStyles.itemTitle}>{value}</dd>
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
      <ContentSection
        description="Imports are blocked until the current legal bundle is accepted."
        title="Accept updated terms"
      >
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
          >
            {createLegalAcceptance.error ? (
              <ItemNotice
                description={createLegalAcceptance.error.message}
                title="Legal terms could not be accepted"
                variant="error"
              />
            ) : null}

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
                const error = getFieldError(field.state.meta.errors);

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
                      <p className={textStyles.mutedBody}>
                        Campaign sends will use the same gate when campaigns
                        launch.
                      </p>
                      {error ? (
                        <p
                          className={textStyles.error}
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
      </ContentSection>
    );
  }

  if (session.readiness.legalUpdatesRequired) {
    return (
      <ItemNotice
        description="An organization admin needs to accept the updated legal terms before imports and campaigns can continue."
        title="Admin acceptance required"
        variant="warning"
      />
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
