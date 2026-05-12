import {
  appLegalDocumentUrl,
  type OrganizationSession,
} from '@retaino/shared/contracts';
import { useForm } from '@tanstack/react-form';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
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
import { useCreateCurrentOrganizationLegalAcceptance } from '@/features/onboarding/hooks/use-create-current-organization-legal-acceptance';
import { legalBundleDocumentLabels } from '@/features/onboarding/onboarding.constants';
import { getFieldError } from '@/lib/form-errors';

export function ComplianceSection({
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
  const status = legalAgreementStatus(session);

  return (
    <Item
      asChild
      className="grid items-stretch gap-5 border-border bg-card px-5 py-5"
    >
      <section id="legal-agreement">
        <ItemHeader className="items-start">
          <ItemMedia className={status.iconClassName} variant="icon">
            {status.kind === 'current' ? (
              <CheckCircle2
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
          <ItemContent className="gap-2">
            <ItemTitle className="flex-wrap text-base">
              Legal agreement
              <Badge className={status.badgeClassName} variant="outline">
                {status.label}
              </Badge>
            </ItemTitle>
            <ItemDescription className="max-w-2xl">
              {status.description}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button asChild size="sm" type="button" variant="outline">
              <Link href={firstLegalDocumentUrl(session)}>
                View legal documents
              </Link>
            </Button>
          </ItemActions>
        </ItemHeader>

        <dl className="grid gap-4 border-y py-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Bundle version</dt>
            <dd className="mt-1 font-medium">{session.legalBundle.version}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Accepted by</dt>
            <dd className="mt-1 font-medium">
              {session.legalAcceptance?.acceptedByEmail ?? 'Not accepted'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Accepted at</dt>
            <dd className="mt-1 font-medium">
              {session.legalAcceptance
                ? formatDateTime(session.legalAcceptance.acceptedAt)
                : 'Not accepted'}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {session.legalBundle.documents.map((document) => {
            const label =
              legalBundleDocumentLabels[
                document.documentType as keyof typeof legalBundleDocumentLabels
              ] ?? document.title;

            return (
              <Link
                className="font-medium text-foreground underline-offset-4 hover:underline"
                href={appLegalDocumentUrl({
                  documentType: document.documentType,
                  documentVersion: document.documentVersion,
                })}
                key={document.id}
              >
                {label}
              </Link>
            );
          })}
        </div>

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
                        Imports are blocked until the current bundle is
                        accepted. Campaign sends will use the same gate when
                        campaigns launch.
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
                      <Loader2 aria-hidden="true" className="animate-spin" />
                    ) : null}
                    Accept updated terms
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
              An organization admin needs to accept the updated legal terms
              before imports and campaigns can continue.
            </AlertDescription>
          </Alert>
        ) : null}
      </section>
    </Item>
  );
}

function legalAgreementStatus(session: OrganizationSession) {
  if (session.readiness.legalCurrent) {
    return {
      badgeClassName:
        'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
      description: 'Current legal bundle accepted for this organization.',
      iconClassName:
        'mt-0.5 size-8 rounded-md bg-muted text-emerald-700 dark:text-emerald-300',
      kind: 'current',
      label: 'Current',
    } as const;
  }

  if (session.readiness.legalUpdatesRequired) {
    return {
      badgeClassName:
        'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300',
      description:
        'Updated legal terms must be accepted before imports or campaigns can continue.',
      iconClassName:
        'mt-0.5 size-8 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
      kind: 'update',
      label: 'Update required',
    } as const;
  }

  return {
    badgeClassName: '',
    description: 'Legal terms must be accepted to finish organization setup.',
    iconClassName: 'mt-0.5 size-8 rounded-md bg-muted text-muted-foreground',
    kind: 'missing',
    label: 'Setup incomplete',
  } as const;
}

function firstLegalDocumentUrl(session: OrganizationSession) {
  const [document] = session.legalBundle.documents;

  return document
    ? appLegalDocumentUrl({
        documentType: document.documentType,
        documentVersion: document.documentVersion,
      })
    : '/app/legal';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
