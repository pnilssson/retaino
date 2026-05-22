"use client";

import { useForm } from '@tanstack/react-form';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  CalendarIcon,
  Loader2,
  MailX,
  Pencil,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  type ContactDetail,
  type ContactSuppression,
  type UpdateContactInput,
  normalizePhoneNumber,
} from '@retaino/shared/contracts';
import { ItemNotice } from '@/components/item-notice';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ConfirmDialog } from '@/components/confirm-dialog';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useContact } from '@/features/contacts/hooks/use-contact';
import { useDeleteContact } from '@/features/contacts/hooks/use-delete-contact';
import { useDeleteContactSuppression } from '@/features/contacts/hooks/use-delete-contact-suppression';
import { useSuppressContact } from '@/features/contacts/hooks/use-suppress-contact';
import { useUpdateContact } from '@/features/contacts/hooks/use-update-contact';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { BlockedContacts } from './blocked-contacts';
import {
  formatContactIssue,
  formatDate,
  formatDateTime,
  formatSuppressionReason,
} from '../contacts-format';
import { ContactStatusBadge } from './status-badge';

export function ContactDetailScreen({ contactId }: { contactId: string }) {
  const session = useOrganizationSession();
  const contact = useContact({
    contactId,
    enabled: Boolean(session.data?.readiness.ready),
    organizationId: session.data?.organization.id ?? null,
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

  const latestContact = contact.data?.contact ?? null;
  const title = latestContact?.name ?? 'Unnamed contact';

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-6xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <Button asChild variant="outline">
              <Link href={routes.contacts}>
                <ArrowLeft aria-hidden="true" data-icon="inline-start" />
                Back to contacts
              </Link>
            </Button>
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
            contact={latestContact}
            phoneCountryCode={session.data.profile?.countryCode ?? 'SE'}
          />
        ) : null}
      </section>
    </main>
  );
}

function ContactDetailContent({
  contact,
  phoneCountryCode,
}: {
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
            {!isEditing ? (
              <ItemActions>
                <Button
                  onClick={() => setIsEditing(true)}
                  type="button"
                  variant="outline"
                >
                  <Pencil aria-hidden="true" data-icon="inline-start" />
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
            </dl>
          )}
        </section>
      </AppPageItem>

      <AppPageItem asChild>
        <section>
          <ItemHeader className="items-start">
            <ItemContent className="gap-2">
              <ItemTitle className="flex flex-wrap items-center gap-2 text-base">
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
        contact={contact}
      />
      <DeleteContactSection contact={contact} />
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
  const updateContact = useUpdateContact(
    contact.organizationId,
    contact.id,
    onSaved,
  );
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
              <LastBookingDatePicker
                name={field.name}
                onChange={field.handleChange}
                value={field.state.value}
              />
            </FormField>
          )}
        </form.Field>
      </div>
      {updateContact.error ? (
        <ItemNotice
          description={updateContact.error}
          title="Contact could not be saved"
          tone="destructive"
        />
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
            <Loader2
              aria-hidden="true"
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : null}
          Save contact
        </Button>
      </div>
    </form>
  );
}

function ContactSuppressionSection({
  contact,
}: {
  contact: ContactDetail;
}) {
  const suppress = useSuppressContact(contact.organizationId, contact.id);
  const unsuppress = useDeleteContactSuppression(
    contact.organizationId,
    contact.id,
  );
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
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!contact.phone || phoneSuppressed || suppress.mutation.isPending}
            onClick={() => suppress.mutation.mutate({ type: 'phone' })}
            type="button"
            variant="outline"
          >
            <Ban aria-hidden="true" data-icon="inline-start" />
            Suppress phone
          </Button>
          <Button
            disabled={!contact.email || emailSuppressed || suppress.mutation.isPending}
            onClick={() => suppress.mutation.mutate({ type: 'email' })}
            type="button"
            variant="outline"
          >
            <MailX aria-hidden="true" data-icon="inline-start" />
            Suppress email
          </Button>
        </div>
        {suppress.error || unsuppress.error ? (
          <ItemNotice
            description={suppress.error ?? unsuppress.error}
            title="Suppression could not be updated"
            tone="destructive"
          />
        ) : null}
      </section>
    </AppPageItem>
  );
}

function SuppressionRow({
  isPending,
  onAllowAgain,
  suppression,
}: {
  isPending: boolean;
  onAllowAgain: () => void;
  suppression: ContactSuppression;
}) {
  const method = suppression.type === 'phone' ? 'Phone' : 'Email';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="grid min-w-0 gap-1">
        <ItemTitle>{method}</ItemTitle>
        <p className="break-all text-sm">{suppression.value}</p>
        <p className="text-xs text-muted-foreground">
          {formatSuppressionReason(suppression.reason)},{' '}
          {formatDateTime(suppression.createdAt)}
        </p>
      </div>
      <Button
        disabled={isPending}
        onClick={onAllowAgain}
        size="sm"
        type="button"
        variant="outline"
      >
        {isPending ? (
          <Loader2
            aria-hidden="true"
            className="animate-spin"
            data-icon="inline-start"
          />
        ) : (
          <Undo2 aria-hidden="true" data-icon="inline-start" />
        )}
        Allow again
      </Button>
    </div>
  );
}

function DeleteContactSection({ contact }: { contact: ContactDetail }) {
  const deleteContact = useDeleteContact(contact.organizationId, contact.id);

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
          <ItemActions>
            <ConfirmDialog
              confirmLabel="Delete permanently"
              description="This permanently deletes the contact from this organization."
              isPending={deleteContact.mutation.isPending}
              onConfirm={() => deleteContact.mutation.mutateAsync()}
              title="Delete contact?"
              trigger={
                <Button type="button" variant="destructive">
                  <Trash2 aria-hidden="true" data-icon="inline-start" />
                  Delete contact
                </Button>
              }
              variant="destructive"
            />
          </ItemActions>
        </ItemHeader>
        {deleteContact.error ? (
          <ItemNotice
            description={deleteContact.error}
            title="Contact could not be deleted"
            tone="destructive"
          />
        ) : null}
      </section>
    </AppPageItem>
  );
}

function LastBookingDatePicker({
  name,
  onChange,
  value,
}: {
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = dateInputToLocalDate(value);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label="Select last booking date"
          className="w-full justify-start"
          id={name}
          type="button"
          variant="outline"
        >
          <CalendarIcon aria-hidden="true" data-icon="inline-start" />
          {selectedDate ? formatDateInputLabel(value) : 'Select date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          captionLayout="dropdown"
          mode="single"
          onSelect={(date) => {
            onChange(date ? localDateToDateInput(date) : '');
            setOpen(false);
          }}
          selected={selectedDate}
        />
        {selectedDate ? (
          <div className="flex justify-end border-t p-2">
            <Button
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" data-icon="inline-start" />
              Clear
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
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

function contactToFormValues(contact: ContactDetail, phoneCountryCode = 'SE') {
  return {
    email: contact.email ?? '',
    lastBookingAt: dateInputValue(contact.lastBookingAt),
    name: contact.name ?? '',
    phone: contact.phone ?? '',
    phoneCountryCode,
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
    name: nullableFormValue(value.name),
    phone: normalizedPhone,
    phoneCountryCode: value.phoneCountryCode,
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

function dateInputToLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function localDateToDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateInputLabel(value: string) {
  const date = dateInputToLocalDate(value);

  if (!date) {
    return 'Select date';
  }

  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}

function nullablePhoneFormValue(value: string, countryCode: string) {
  const trimmed = nullableFormValue(value);

  if (!trimmed) {
    return null;
  }

  const normalized = normalizePhoneNumber(trimmed, countryCode);

  return normalized.ok ? normalized.normalizedPhone : trimmed;
}
