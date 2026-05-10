"use client";

import { useClerk } from '@clerk/nextjs';
import { useForm } from '@tanstack/react-form';
import {
  AlertCircle,
  CheckCircle2,
  FileWarning,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  appLegalDocumentUrl,
  canManageOrganizationSetup,
  formatPhoneCountryLabel,
  type OrganizationSession
} from '@retaino/shared/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CountryCombobox } from '@/components/country-combobox';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/phone-input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemTitle
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useCreateCurrentOrganizationAcceptances } from '@/features/onboarding/hooks/use-create-current-organization-acceptances';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { useUpdateOrganizationProfile } from '@/features/onboarding/hooks/use-update-organization-profile';
import {
  organizationProfileFormValuesFromSession,
  organizationProfileFormValuesToUpdateInput,
  type OrganizationProfileFormValues,
  validateCountryCode,
  validateEmail,
  validatePhone,
  validateRequired
} from '@/features/organization-profile/organization-profile-form';
import { complianceDocumentLabels } from '@/features/onboarding/onboarding.constants';
import { getFieldError } from '@/lib/form-errors';
import { routes } from '@/lib/routes';
import { TeamInvitationSection } from './team-invitation-section';

export function OrganizationSettingsScreen() {
  const session = useOrganizationSession();
  const { openOrganizationProfile } = useClerk();

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

  const canManageSetup = canManageOrganizationSetup(
    session.data.organization.role
  );
  const status = organizationSettingsStatus(session.data);
  const headerActions = canManageSetup ? (
    session.data.readiness.setupComplete ? (
      <Button
        onClick={() => openOrganizationProfile()}
        type="button"
        variant="outline"
      >
        Manage organization
      </Button>
    ) : (
      <Button asChild variant="outline">
        <Link href={routes.organizationSetup}>Finish setup</Link>
      </Button>
    )
  ) : null;

  return (
    <main className="flex flex-1 bg-background">
      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={headerActions}
          badge={
            <Badge variant={status.badgeVariant}>{status.label}</Badge>
          }
          description="Manage organization identity, compliance records, and team access from one place."
          eyebrow="Organization settings"
          title={session.data.organization.name}
        />

        <ItemGroup className="gap-5">
          <OrganizationProfileSection
            canManageSetup={canManageSetup}
            session={session.data}
          />
          <TeamInvitationSection session={session.data} />
          <ComplianceSection
            canManageSetup={canManageSetup}
            session={session.data}
          />
        </ItemGroup>
      </section>
    </main>
  );
}

function OrganizationProfileSection({
  canManageSetup,
  session
}: {
  canManageSetup: boolean;
  session: OrganizationSession;
}) {
  const updateProfile = useUpdateOrganizationProfile();
  const [isEditing, setIsEditing] = useState(false);
  const profile = session.profile;
  const form = useForm({
    defaultValues: organizationProfileFormValuesFromSession(session),
    onSubmit: async ({ value }) => {
      await updateProfile.mutateAsync(
        organizationProfileFormValuesToUpdateInput(value)
      );
      setIsEditing(false);
    }
  });

  function openEditMode() {
    form.reset(organizationProfileFormValuesFromSession(session));
    setIsEditing(true);
  }

  function closeEditMode() {
    form.reset(organizationProfileFormValuesFromSession(session));
    setIsEditing(false);
  }

  return (
    <Item asChild className="grid items-stretch gap-5 border-border bg-card px-5 py-5">
      <section id="organization-profile">
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle className="flex-wrap text-base">
              Organization profile
              {!profile ? <Badge variant="outline">Missing</Badge> : null}
            </ItemTitle>
            <ItemDescription className="max-w-2xl">
              Legal, billing, and responsible contact details for this
              organization.
            </ItemDescription>
          </ItemContent>
          {canManageSetup && !isEditing ? (
            <ItemActions>
              <Button
                onClick={openEditMode}
                type="button"
                variant="outline"
              >
                {profile ? 'Edit profile' : 'Complete profile'}
              </Button>
            </ItemActions>
          ) : null}
        </ItemHeader>

        {isEditing ? (
          <form
            className="grid gap-5"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <form.Field
                name="legalName"
                validators={{
                  onChange: ({ value }) => validateRequired(
                    value,
                    'Enter the legal company name.'
                  ),
                  onSubmit: ({ value }) => validateRequired(
                    value,
                    'Enter the legal company name.'
                  )
                }}
              >
                {(field) => (
                  <ProfileInput
                    error={getFieldError(field.state.meta.errors)}
                    label="Legal name"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field
                name="registrationNumber"
                validators={{
                  onChange: ({ value }) => validateRequired(
                    value,
                    'Enter the registration number.'
                  ),
                  onSubmit: ({ value }) => validateRequired(
                    value,
                    'Enter the registration number.'
                  )
                }}
              >
                {(field) => (
                  <ProfileInput
                    error={getFieldError(field.state.meta.errors)}
                    label="Registration number"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field
                name="billingEmail"
                validators={{
                  onChange: ({ value }) => validateEmail(value, 'billing email'),
                  onSubmit: ({ value }) => validateEmail(value, 'billing email')
                }}
              >
                {(field) => (
                  <ProfileInput
                    error={getFieldError(field.state.meta.errors)}
                    label="Billing email"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    type="email"
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field
                name="responsibleName"
                validators={{
                  onChange: ({ value }) => validateRequired(
                    value,
                    'Enter the responsible contact.'
                  ),
                  onSubmit: ({ value }) => validateRequired(
                    value,
                    'Enter the responsible contact.'
                  )
                }}
              >
                {(field) => (
                  <ProfileInput
                    error={getFieldError(field.state.meta.errors)}
                    label="Responsible contact"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field
                name="responsibleEmail"
                validators={{
                  onChange: ({ value }) =>
                    validateEmail(value, 'responsible email'),
                  onSubmit: ({ value }) =>
                    validateEmail(value, 'responsible email')
                }}
              >
                {(field) => (
                  <ProfileInput
                    error={getFieldError(field.state.meta.errors)}
                    label="Responsible email"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    type="email"
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field
                name="responsiblePhone"
                validators={{
                  onChange: ({ value }) =>
                    validatePhone(value, form.getFieldValue('countryCode')),
                  onSubmit: ({ value }) =>
                    validatePhone(value, form.getFieldValue('countryCode'))
                }}
              >
                {(field) => (
                  <ProfilePhoneInput
                    countryCode={form.getFieldValue('countryCode')}
                    error={getFieldError(field.state.meta.errors)}
                    label="Responsible phone"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    onCountryChange={(value) =>
                      form.setFieldValue('countryCode', value)
                    }
                    value={field.state.value}
                  />
                )}
              </form.Field>
              <form.Field
                name="countryCode"
                validators={{
                  onChange: ({ value }) => validateCountryCode(value),
                  onSubmit: ({ value }) => validateCountryCode(value)
                }}
              >
                {(field) => (
                  <ProfileCountryInput
                    error={getFieldError(field.state.meta.errors)}
                    label="Default phone country"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(value) =>
                      field.handleChange(value as typeof field.state.value)
                    }
                    value={field.state.value}
                  />
                )}
              </form.Field>
            </div>

            {updateProfile.error ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>Profile could not be saved</AlertTitle>
                <AlertDescription>{updateProfile.error.message}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                disabled={updateProfile.isPending}
                onClick={closeEditMode}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    disabled={
                      !canSubmit || updateProfile.isPending || isSubmitting
                    }
                    type="submit"
                  >
                    {updateProfile.isPending || isSubmitting
                      ? 'Saving profile'
                      : 'Save profile'}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </form>
        ) : profile ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <ProfileRow label="Legal name" value={profile.legalName} />
            <ProfileRow
              label="Registration number"
              value={profile.registrationNumber}
            />
            <ProfileRow label="Billing email" value={profile.billingEmail} />
            <ProfileRow
              label="Responsible contact"
              value={profile.responsibleName}
            />
            <ProfileRow
              label="Responsible email"
              value={profile.responsibleEmail}
            />
            <ProfileRow
              label="Responsible phone"
              value={profile.responsiblePhone ?? 'Not provided'}
            />
            <ProfileRow
              label="Default phone country"
              value={formatPhoneCountryLabel(profile.countryCode)}
            />
          </dl>
        ) : (
          <Alert>
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Profile is not complete</AlertTitle>
            <AlertDescription>
              Organization admins need to add company and responsible contact
              details before the workspace is ready.
            </AlertDescription>
          </Alert>
        )}
      </section>
    </Item>
  );
}

function ProfileInput({
  error,
  label,
  name,
  onBlur,
  onChange,
  type = 'text',
  value
}: {
  error: string | null;
  label: string;
  name: keyof OrganizationProfileFormValues;
  onBlur: () => void;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
      {error ? (
        <p className="text-xs text-destructive" id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ProfileCountryInput({
  error,
  label,
  name,
  onBlur,
  onChange,
  value
}: {
  error: string | null;
  label: string;
  name: keyof OrganizationProfileFormValues;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <CountryCombobox
        aria-invalid={Boolean(error)}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        value={value}
      />
      {error ? (
        <p className="text-xs text-destructive" id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ProfilePhoneInput({
  countryCode,
  error,
  label,
  name,
  onBlur,
  onChange,
  onCountryChange,
  value
}: {
  countryCode: string;
  error: string | null;
  label: string;
  name: keyof OrganizationProfileFormValues;
  onBlur: () => void;
  onChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <PhoneInput
        aria-invalid={Boolean(error)}
        countryCode={countryCode}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={onChange}
        onCountryChange={onCountryChange}
        value={value}
      />
      {error ? (
        <p className="text-xs text-destructive" id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

function ComplianceSection({
  canManageSetup,
  session
}: {
  canManageSetup: boolean;
  session: OrganizationSession;
}) {
  const createAcceptances = useCreateCurrentOrganizationAcceptances();
  const form = useForm({
    defaultValues: {
      authorization: false
    },
    onSubmit: async () => {
      await createAcceptances.mutateAsync({
        documents: session.requiredLegalDocuments.map((document) => ({
          documentType:
            document.documentType as keyof typeof complianceDocumentLabels,
          documentVersion: document.documentVersion
        }))
      });
      form.reset();
    }
  });
  const acceptedByType = new Map(
    session.acceptedDocuments.map((document) => [
      document.documentType,
      document
    ])
  );
  const currentAccepted = new Set(
    session.acceptedDocuments.map(
      (document) => `${document.documentType}:${document.documentVersion}`
    )
  );

  return (
    <Item asChild className="grid items-stretch gap-5 border-border bg-card px-5 py-5">
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
              `${document.documentType}:${document.documentVersion}`
            );
            const acceptedDocument = acceptedByType.get(document.documentType);
            const label =
              complianceDocumentLabels[
                document.documentType as keyof typeof complianceDocumentLabels
              ] ?? document.title;
            const status = complianceDocumentStatus({
              acceptedVersion: acceptedDocument?.documentVersion ?? null,
              currentVersion: document.documentVersion,
              isCurrentAccepted
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
                        documentVersion: document.documentVersion
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
                onChange: ({ value }) => value
                  ? undefined
                  : 'Confirm that you are authorized to accept these updated documents.',
                onSubmit: ({ value }) => value
                  ? undefined
                  : 'Confirm that you are authorized to accept these updated documents.'
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

function organizationSettingsStatus(session: OrganizationSession) {
  if (session.readiness.ready) {
    return {
      badgeVariant: 'default',
      label: 'Ready'
    } as const;
  }

  if (session.readiness.legalUpdatesRequired) {
    return {
      badgeVariant: 'outline',
      label: 'Legal updates required'
    } as const;
  }

  return {
    badgeVariant: 'outline',
    label: 'Setup incomplete'
  } as const;
}

function complianceDocumentStatus({
  acceptedVersion,
  currentVersion,
  isCurrentAccepted
}: {
  acceptedVersion: string | null;
  currentVersion: string;
  isCurrentAccepted: boolean;
}) {
  if (isCurrentAccepted) {
    return {
      badgeClassName: 'border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300',
      badgeVariant: 'outline',
      description: `Version ${currentVersion} accepted.`,
      iconClassName:
        'mt-0.5 size-8 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
      kind: 'current',
      label: 'Current'
    } as const;
  }

  if (acceptedVersion) {
    return {
      badgeClassName: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300',
      badgeVariant: 'outline',
      description: `Accepted version ${acceptedVersion}. Latest version ${currentVersion} requires acceptance.`,
      iconClassName:
        'mt-0.5 size-8 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
      kind: 'older',
      label: 'Update required'
    } as const;
  }

  return {
    badgeClassName: '',
    badgeVariant: 'outline',
    description: `Version ${currentVersion} requires acceptance.`,
    iconClassName: 'mt-0.5 size-8 rounded-md bg-muted text-muted-foreground',
    kind: 'missing',
    label: 'Required'
  } as const;
}
