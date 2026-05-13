"use client";

import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Loader2, Trash2, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  canManageOrganizationSetup,
  type ContactDetail,
  type ContactDetailResponse,
  type ContactSuppression,
  type CreateContactSuppressionInput,
  type UpdateContactInput,
  normalizePhoneNumber,
} from '@retaino/shared/contracts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/phone-input';
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
import { useApi } from '@/features/onboarding/hooks/use-api';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { ApiClientError } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { BlockedContacts } from './blocked-contacts';
import {
  formatContactIssue,
  formatDate,
  formatDateTime,
  formatSuppressionReason,
} from './contacts-format';
import { ContactStatusBadge } from './status-badge';

export function ContactDetailScreen({ contactId }: { contactId: string }) {
  const api = useApi();
  const session = useOrganizationSession();
  const contact = useQuery({
    enabled: Boolean(session.data?.readiness.ready),
    queryKey: ['contact', contactId],
    queryFn: () =>
      api.get<ContactDetailResponse>(`/v1/contacts/${contactId}`),
  });

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <p className="text-sm text-muted-foreground">Loading contact.</p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <Alert className="max-w-lg" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Contact could not be loaded</AlertTitle>
          <AlertDescription>{session.error.message}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  if (!session.data.readiness.ready) {
    return <BlockedContacts session={session.data} />;
  }

  const canManageContacts = canManageOrganizationSetup(
    session.data.organization.role,
  );
  const latestContact = contact.data?.contact ?? null;
  const title = latestContact?.name ?? 'Unnamed contact';

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <Button asChild variant="outline">
              <Link href={routes.contacts}>
                <ArrowLeft aria-hidden="true" />
                Back to contacts
              </Link>
            </Button>
          }
          badge={
            latestContact ? (
              <ContactStatusBadge status={latestContact.contactStatus} />
            ) : undefined
          }
          description="Review contact data, SMS readiness, and suppression state."
          eyebrow="Contact"
          title={title}
        />

        {contact.isError ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Contact could not be fetched</AlertTitle>
            <AlertDescription>
              {contact.error instanceof Error
                ? contact.error.message
                : 'Try refreshing the page.'}
            </AlertDescription>
          </Alert>
        ) : contact.isLoading ? (
          <section className="py-8">
            <p className="text-sm text-muted-foreground">Loading contact.</p>
          </section>
        ) : latestContact ? (
          <ContactDetailContent
            canManageContacts={canManageContacts}
            contact={latestContact}
            phoneCountryCode={session.data.profile?.countryCode ?? 'SE'}
          />
        ) : null}
      </section>
    </main>
  );
}

function ContactDetailContent({
  canManageContacts,
  contact,
  phoneCountryCode,
}: {
  canManageContacts: boolean;
  contact: ContactDetail;
  phoneCountryCode: string;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <AppPageContent>
      <AppPageItem asChild>
        <section>
          <ItemHeader className="items-start">
            <ItemContent className="gap-2">
              <ItemTitle className="text-base">Contact details</ItemTitle>
              <ItemDescription>
                Core identity and contact information.
              </ItemDescription>
            </ItemContent>
            {canManageContacts && !isEditing ? (
              <ItemActions>
                <Button
                  onClick={() => setIsEditing(true)}
                  type="button"
                  variant="outline"
                >
                  Edit contact
                </Button>
              </ItemActions>
            ) : null}
          </ItemHeader>

          {isEditing ? (
            <ContactEditForm
              contact={contact}
              onCancel={() => setIsEditing(false)}
              onSaved={() => setIsEditing(false)}
              phoneCountryCode={phoneCountryCode}
            />
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailField label="Name" value={contact.name ?? 'Unnamed'} />
              <DetailField label="Phone" value={contact.phone ?? 'No phone'} />
              <DetailField label="Email" value={contact.email ?? 'No email'} />
              <DetailField label="Source" value={contact.source ?? 'Import'} />
              <DetailField label="Last service" value={contact.lastService ?? 'Unknown'} />
            </dl>
          )}
        </section>
      </AppPageItem>

      <AppPageItem asChild>
        <section>
          <ItemHeader className="items-start">
            <ItemContent className="gap-2">
              <ItemTitle className="flex-wrap text-base">
                SMS readiness
                <ContactStatusBadge status={contact.contactStatus} />
              </ItemTitle>
              <ItemDescription>
                Why this contact can or cannot receive SMS campaigns.
              </ItemDescription>
            </ItemContent>
          </ItemHeader>
          {contact.contactIssues.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {contact.contactIssues.map((issue) => (
                <span
                  className="rounded-md bg-muted px-2 py-1 text-sm text-muted-foreground"
                  key={issue}
                >
                  {formatContactIssue(issue)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This contact has a valid phone number and no phone suppression.
            </p>
          )}
        </section>
      </AppPageItem>

      <AppPageItem asChild>
        <section>
          <ItemHeader className="items-start">
            <ItemContent className="gap-2">
              <ItemTitle className="text-base">Activity</ItemTitle>
              <ItemDescription>
                Import and booking context for this contact.
              </ItemDescription>
            </ItemContent>
          </ItemHeader>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailField label="Last booking" value={formatDate(contact.lastBookingAt)} />
            <DetailField label="Last contacted" value={formatDate(contact.lastContactedAt)} />
            <DetailField label="Imported" value={formatDateTime(contact.createdAt)} />
            <DetailField label="Updated" value={formatDateTime(contact.updatedAt)} />
          </dl>
        </section>
      </AppPageItem>

      <ContactSuppressionSection
        canManageContacts={canManageContacts}
        contact={contact}
      />
      {canManageContacts ? <DeleteContactSection contact={contact} /> : null}
    </AppPageContent>
  );
}

function ContactEditForm({
  contact,
  onCancel,
  onSaved,
  phoneCountryCode,
}: {
  contact: ContactDetail;
  onCancel: () => void;
  onSaved: () => void;
  phoneCountryCode: string;
}) {
  const updateContact = useUpdateContact(contact.id, onSaved);
  const form = useForm({
    defaultValues: contactToFormValues(contact, phoneCountryCode),
    onSubmit: async ({ value }) => {
      await updateContact.mutation.mutateAsync(
        contactFormValuesToInput(value),
      );
    },
  });

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <form.Field name="name">
          {(field) => (
            <FormField label="Name">
              <Input
                name={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="phone">
          {(field) => (
            <FormField label="Phone">
              <PhoneInput
                countryCode={form.getFieldValue('phoneCountryCode')}
                name={field.name}
                onChange={field.handleChange}
                onCountryChange={(value) =>
                  form.setFieldValue('phoneCountryCode', value)
                }
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <FormField label="Email">
              <Input
                name={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                type="email"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="lastBookingAt">
          {(field) => (
            <FormField label="Last booking">
              <Input
                name={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                type="date"
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="lastService">
          {(field) => (
            <FormField label="Last service">
              <Input
                name={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
        <form.Field name="source">
          {(field) => (
            <FormField label="Source">
              <Input
                name={field.name}
                onChange={(event) => field.handleChange(event.target.value)}
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
      </div>
      {updateContact.error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Contact could not be saved</AlertTitle>
          <AlertDescription>{updateContact.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={updateContact.mutation.isPending}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button disabled={updateContact.mutation.isPending} type="submit">
          {updateContact.mutation.isPending ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : null}
          Save contact
        </Button>
      </div>
    </form>
  );
}

function ContactSuppressionSection({
  canManageContacts,
  contact,
}: {
  canManageContacts: boolean;
  contact: ContactDetail;
}) {
  const suppress = useSuppressContact(contact.id);
  const unsuppress = useDeleteContactSuppression(contact.id);
  const phoneSuppressed = contact.suppressions.some(
    (suppression) => suppression.type === 'phone',
  );
  const emailSuppressed = contact.suppressions.some(
    (suppression) => suppression.type === 'email',
  );

  return (
    <AppPageItem asChild>
      <section>
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle className="text-base">Suppressions</ItemTitle>
            <ItemDescription>
              Methods excluded from future outreach.
            </ItemDescription>
          </ItemContent>
        </ItemHeader>
        {contact.suppressions.length > 0 ? (
          <div className="divide-y">
            {contact.suppressions.map((suppression) => (
              <SuppressionRow
                canManageContacts={canManageContacts}
                isPending={
                  unsuppress.mutation.isPending &&
                  unsuppress.mutation.variables === suppression.id
                }
                key={suppression.id}
                onAllowAgain={() => unsuppress.mutation.mutate(suppression.id)}
                suppression={suppression}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No contact methods are suppressed.
          </p>
        )}
        {canManageContacts ? (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!contact.phone || phoneSuppressed || suppress.mutation.isPending}
              onClick={() => suppress.mutation.mutate({ type: 'phone' })}
              type="button"
              variant="outline"
            >
              Suppress phone
            </Button>
            <Button
              disabled={!contact.email || emailSuppressed || suppress.mutation.isPending}
              onClick={() => suppress.mutation.mutate({ type: 'email' })}
              type="button"
              variant="outline"
            >
              Suppress email
            </Button>
          </div>
        ) : null}
        {suppress.error || unsuppress.error ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Suppression could not be updated</AlertTitle>
            <AlertDescription>{suppress.error ?? unsuppress.error}</AlertDescription>
          </Alert>
        ) : null}
      </section>
    </AppPageItem>
  );
}

function SuppressionRow({
  canManageContacts,
  isPending,
  onAllowAgain,
  suppression,
}: {
  canManageContacts: boolean;
  isPending: boolean;
  onAllowAgain: () => void;
  suppression: ContactSuppression;
}) {
  const method = suppression.type === 'phone' ? 'Phone' : 'Email';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="grid min-w-0 gap-1">
        <p className="text-sm font-medium">{method}</p>
        <p className="break-all text-sm">{suppression.value}</p>
        <p className="text-xs text-muted-foreground">
          {formatSuppressionReason(suppression.reason)},{' '}
          {formatDateTime(suppression.createdAt)}
        </p>
      </div>
      {canManageContacts ? (
        <Button
          disabled={isPending}
          onClick={onAllowAgain}
          size="sm"
          type="button"
          variant="outline"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Undo2 aria-hidden="true" />
          )}
          Allow again
        </Button>
      ) : null}
    </div>
  );
}

function DeleteContactSection({ contact }: { contact: ContactDetail }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const deleteContact = useDeleteContact(contact.id);

  return (
    <AppPageItem asChild>
      <section>
        <ItemHeader className="items-start">
          <ItemContent className="gap-2">
            <ItemTitle className="text-base">Delete contact</ItemTitle>
            <ItemDescription>
              Remove this contact from the organization.
            </ItemDescription>
          </ItemContent>
          {!isConfirming ? (
            <ItemActions>
              <Button
                onClick={() => setIsConfirming(true)}
                type="button"
                variant="destructive"
              >
                <Trash2 aria-hidden="true" />
                Delete contact
              </Button>
            </ItemActions>
          ) : null}
        </ItemHeader>
        {isConfirming ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              This permanently deletes the contact.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={deleteContact.mutation.isPending}
                onClick={() => setIsConfirming(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={deleteContact.mutation.isPending}
                onClick={() => deleteContact.mutation.mutate()}
                type="button"
                variant="destructive"
              >
                {deleteContact.mutation.isPending ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Trash2 aria-hidden="true" />
                )}
                Delete permanently
              </Button>
            </div>
          </div>
        ) : null}
        {deleteContact.error ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>Contact could not be deleted</AlertTitle>
            <AlertDescription>{deleteContact.error}</AlertDescription>
          </Alert>
        ) : null}
      </section>
    </AppPageItem>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function FormField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function useUpdateContact(contactId: string, onSaved: () => void) {
  const api = useApi();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: UpdateContactInput) =>
      api.request<ContactDetailResponse>(`/v1/contacts/${contactId}`, {
        body: input,
        method: 'PATCH',
      }),
    onSuccess: async (response) => {
      queryClient.setQueryData(['contact', contactId], response);
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      onSaved();
    },
  });

  return {
    error: mutation.error instanceof Error ? mutation.error.message : null,
    mutation,
  };
}

function useSuppressContact(contactId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (input: CreateContactSuppressionInput) =>
      api.post<ContactDetailResponse>(
        `/v1/contacts/${contactId}/suppressions`,
        input,
      ),
    onSuccess: async (response) => {
      queryClient.setQueryData(['contact', contactId], response);
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  return {
    error: mutation.error instanceof Error ? mutation.error.message : null,
    mutation,
  };
}

function useDeleteContactSuppression(contactId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (suppressionId: string) =>
      api.request<ContactDetailResponse>(
        `/v1/contacts/${contactId}/suppressions/${suppressionId}`,
        { method: 'DELETE' },
      ),
    onSuccess: async (response) => {
      queryClient.setQueryData(['contact', contactId], response);
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  return {
    error: mutation.error instanceof Error ? mutation.error.message : null,
    mutation,
  };
}

function useDeleteContact(contactId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: () =>
      api.request<void>(`/v1/contacts/${contactId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['contact', contactId] });
      await queryClient.invalidateQueries({ queryKey: ['contacts'] });
      router.push(routes.contacts);
    },
  });

  return {
    error:
      mutation.error instanceof ApiClientError || mutation.error instanceof Error
        ? mutation.error.message
        : null,
    mutation,
  };
}

function contactToFormValues(contact: ContactDetail, phoneCountryCode = 'SE') {
  return {
    email: contact.email ?? '',
    lastBookingAt: dateInputValue(contact.lastBookingAt),
    lastService: contact.lastService ?? '',
    name: contact.name ?? '',
    phone: contact.phone ?? '',
    phoneCountryCode,
    source: contact.source ?? '',
  };
}

function contactFormValuesToInput(
  value: ReturnType<typeof contactToFormValues>,
): UpdateContactInput {
  const normalizedPhone = nullablePhoneFormValue(
    value.phone,
    value.phoneCountryCode,
  );

  return {
    email: nullableFormValue(value.email),
    lastBookingAt: value.lastBookingAt
      ? new Date(`${value.lastBookingAt}T00:00:00.000Z`).toISOString()
      : null,
    lastService: nullableFormValue(value.lastService),
    name: nullableFormValue(value.name),
    phone: normalizedPhone,
    phoneCountryCode: value.phoneCountryCode,
    source: nullableFormValue(value.source),
  };
}

function nullableFormValue(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function dateInputValue(value: string | null) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

function nullablePhoneFormValue(value: string, countryCode: string) {
  const trimmed = nullableFormValue(value);

  if (!trimmed) {
    return null;
  }

  const normalized = normalizePhoneNumber(trimmed, countryCode);

  return normalized.ok ? normalized.normalizedPhone : trimmed;
}
