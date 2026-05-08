"use client";

import { useClerk } from '@clerk/nextjs';
import { useForm } from '@tanstack/react-form';
import {
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  appLegalDocumentUrl,
  canManageOrganizationSetup,
  type OrganizationSession
} from '@retaino/shared/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { useUpdateOrganizationProfile } from '@/features/onboarding/hooks/use-update-organization-profile';
import {
  organizationProfileFormValuesFromSession,
  organizationProfileFormValuesToUpdateInput,
  type OrganizationProfileFormValues,
  validateEmail,
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
  const currentRequiredVersions = new Set(
    session.data.requiredLegalDocuments.map(
      (document) => `${document.documentType}:${document.documentVersion}`
    )
  );
  const headerActions = canManageSetup ? (
    session.data.readiness.ready ? (
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
            <Badge
              variant={session.data.readiness.ready ? 'default' : 'outline'}
            >
              {session.data.readiness.ready ? 'Ready' : 'Setup incomplete'}
            </Badge>
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
            currentRequiredVersions={currentRequiredVersions}
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
    <Item asChild className="grid items-stretch gap-5 px-5 py-5" variant="muted">
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
              <form.Field name="responsiblePhone">
                {(field) => (
                  <ProfileInput
                    error={getFieldError(field.state.meta.errors)}
                    label="Responsible phone"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
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

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

function ComplianceSection({
  currentRequiredVersions,
  session
}: {
  currentRequiredVersions: Set<string>;
  session: OrganizationSession;
}) {
  return (
    <Item asChild className="grid items-stretch gap-5 px-5 py-5" variant="muted">
      <section id="compliance-documents">
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle className="flex-wrap text-base">
              Compliance documents
              {!session.readiness.complianceComplete ? (
                <Badge variant="outline">Missing records</Badge>
              ) : null}
            </ItemTitle>
            <ItemDescription className="max-w-2xl">
              Accepted document versions recorded for this organization.
            </ItemDescription>
          </ItemContent>
        </ItemHeader>

        {session.acceptedDocuments.length > 0 ? (
          <div className="divide-y">
            {session.acceptedDocuments.map((document) => {
              const isCurrent = currentRequiredVersions.has(
                `${document.documentType}:${document.documentVersion}`
              );
              const label =
                complianceDocumentLabels[
                  document.documentType as keyof typeof complianceDocumentLabels
                ] ?? document.documentType;

              return (
                <div
                  className="grid grid-cols-[1fr_auto] items-center gap-3 py-4"
                  key={document.legalDocumentVersionId}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <ItemMedia
                      className="mt-0.5 size-8 rounded-md bg-muted"
                      variant="icon"
                    >
                      <ShieldCheck
                        aria-hidden="true"
                        className="size-4"
                        strokeWidth={1.5}
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="flex-wrap">
                        {label}
                        {!isCurrent ? (
                          <Badge variant="outline">Older version</Badge>
                        ) : null}
                      </ItemTitle>
                      <ItemDescription>
                        Version {document.documentVersion}
                      </ItemDescription>
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
        ) : (
          <Alert>
            <AlertCircle aria-hidden="true" />
            <AlertTitle>No accepted documents yet</AlertTitle>
            <AlertDescription>
              Required compliance documents will appear here after setup is
              completed.
            </AlertDescription>
          </Alert>
        )}
      </section>
    </Item>
  );
}
