import {
  appLegalDocumentUrl,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { useForm } from '@tanstack/react-form';
import {
  AlertCircle,
  CheckCircle2,
  FileWarning,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { useCreateCurrentOrganizationAcceptances } from '@/features/onboarding/hooks/use-create-current-organization-acceptances';
import { complianceDocumentLabels } from '@/features/onboarding/onboarding.constants';
import { getFieldError } from '@/lib/form-errors';

export function ComplianceSection({
  canManageSetup,
  session,
}: {
  canManageSetup: boolean;
  session: OrganizationSession;
}) {
  const createAcceptances = useCreateCurrentOrganizationAcceptances();
  const form = useForm({
    defaultValues: {
      authorization: false,
    },
    onSubmit: async () => {
      await createAcceptances.mutateAsync({
        documents: session.requiredLegalDocuments.map((document) => ({
          documentType:
            document.documentType as keyof typeof complianceDocumentLabels,
          documentVersion: document.documentVersion,
        })),
      });
      form.reset();
    },
  });
  const acceptedByType = new Map(
    session.acceptedDocuments.map((document) => [
      document.documentType,
      document,
    ]),
  );
  const currentAccepted = new Set(
    session.acceptedDocuments.map(
      (document) => `${document.documentType}:${document.documentVersion}`,
    ),
  );

  return (
    <Item asChild className="grid items-stretch gap-5 px-5 py-5" variant="muted">
      <section id="compliance-documents">
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle className="flex-wrap text-base">
              Compliance documents
              {session.readiness.legalUpdatesRequired ? (
                <Badge
                  className="border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300"
                  variant="outline"
                >
                  Legal updates required
                </Badge>
              ) : !session.readiness.complianceComplete ? (
                <Badge variant="outline">Setup incomplete</Badge>
              ) : null}
            </ItemTitle>
            <ItemDescription className="max-w-2xl">
              Current required document versions and acceptance records for
              this organization.
            </ItemDescription>
          </ItemContent>
        </ItemHeader>

        <div className="divide-y">
          {session.requiredLegalDocuments.map((document) => {
            const isCurrentAccepted = currentAccepted.has(
              `${document.documentType}:${document.documentVersion}`,
            );
            const acceptedDocument = acceptedByType.get(document.documentType);
            const label =
              complianceDocumentLabels[
                document.documentType as keyof typeof complianceDocumentLabels
              ] ?? document.title;
            const status = complianceDocumentStatus({
              acceptedVersion: acceptedDocument?.documentVersion ?? null,
              currentVersion: document.documentVersion,
              isCurrentAccepted,
            });

            return (
              <div
                className="grid grid-cols-[1fr_auto] items-center gap-3 py-4"
                key={document.id}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <ItemMedia className={status.iconClassName} variant="icon">
                    {status.kind === 'current' ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={1.5}
                      />
                    ) : status.kind === 'older' ? (
                      <FileWarning
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <ShieldCheck
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={1.5}
                      />
                    )}
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="flex-wrap">
                      {label}
                      <Badge
                        className={status.badgeClassName}
                        variant={status.badgeVariant}
                      >
                        {status.label}
                      </Badge>
                    </ItemTitle>
                    <ItemDescription>{status.description}</ItemDescription>
                  </ItemContent>
                </div>
                <ItemActions>
                  <Button asChild size="sm" type="button" variant="outline">
                    <Link
                      href={appLegalDocumentUrl({
                        documentType: document.documentType,
                        documentVersion: document.documentVersion,
                      })}
                    >
                      Review
                    </Link>
                  </Button>
                </ItemActions>
              </div>
            );
          })}
        </div>

        {session.requiredLegalDocuments.length === 0 ? (
          <Alert>
            <AlertCircle aria-hidden="true" />
            <AlertTitle>No required documents found</AlertTitle>
            <AlertDescription>
              Required compliance documents will appear here after they are
              published.
            </AlertDescription>
          </Alert>
        ) : null}

        {session.readiness.legalUpdatesRequired && canManageSetup ? (
          <form
            className="grid gap-4 border-y border-amber-200 bg-amber-50/60 py-4 dark:border-amber-900/70 dark:bg-amber-950/20"
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
                onChange: ({ value }) =>
                  value
                    ? undefined
                    : 'Confirm that you are authorized to accept these updated documents.',
                onSubmit: ({ value }) =>
                  value
                    ? undefined
                    : 'Confirm that you are authorized to accept these updated documents.',
              }}
            >
              {(field) => {
                const error =
                  createAcceptances.error?.message ??
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
                        I am authorized to accept these updated documents for
                        this organization.
                      </Label>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Acceptance is recorded for the current document
                        versions.
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
                      !canSubmit || isSubmitting || createAcceptances.isPending
                    }
                    type="submit"
                  >
                    {isSubmitting || createAcceptances.isPending ? (
                      <Loader2 aria-hidden="true" className="animate-spin" />
                    ) : null}
                    Accept updated documents
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        ) : session.readiness.legalUpdatesRequired ? (
          <Alert>
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Admin acceptance required</AlertTitle>
            <AlertDescription>
              An organization admin needs to accept the updated legal documents
              before campaigns and imports can continue.
            </AlertDescription>
          </Alert>
        ) : null}
      </section>
    </Item>
  );
}

function complianceDocumentStatus({
  acceptedVersion,
  currentVersion,
  isCurrentAccepted,
}: {
  acceptedVersion: string | null;
  currentVersion: string;
  isCurrentAccepted: boolean;
}) {
  if (isCurrentAccepted) {
    return {
      badgeClassName:
        'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
      badgeVariant: 'outline',
      description: `Version ${currentVersion} accepted.`,
      iconClassName:
        'mt-0.5 size-8 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
      kind: 'current',
      label: 'Current',
    } as const;
  }

  if (acceptedVersion) {
    return {
      badgeClassName:
        'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300',
      badgeVariant: 'outline',
      description: `Accepted version ${acceptedVersion}. Latest version ${currentVersion} requires acceptance.`,
      iconClassName:
        'mt-0.5 size-8 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
      kind: 'older',
      label: 'Update required',
    } as const;
  }

  return {
    badgeClassName: '',
    badgeVariant: 'outline',
    description: `Version ${currentVersion} requires acceptance.`,
    iconClassName: 'mt-0.5 size-8 rounded-md bg-muted text-muted-foreground',
    kind: 'missing',
    label: 'Required',
  } as const;
}
