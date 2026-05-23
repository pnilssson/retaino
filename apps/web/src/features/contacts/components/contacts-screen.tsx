"use client";

import { FileUp, RefreshCw, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';
import { ItemNotice } from '@/components/item-notice';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  PaginationControls,
  TableLoading,
} from '@/components/data-table';
import {
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import {
  AppPageContent,
  AppPageItem,
} from '@/features/appshell/components/app-page-content';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useContactListQueryState } from '@/features/contacts/hooks/use-contact-list-query-state';
import { useContactPresence } from '@/features/contacts/hooks/use-contact-presence';
import { useContacts } from '@/features/contacts/hooks/use-contacts';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { BlockedContacts } from './blocked-contacts';
import { ContactBulkActions } from './contact-bulk-actions';
import { ContactFilters } from './contact-filters';
import { ContactsTable } from './contacts-table';

export function ContactsScreen() {
  const session = useOrganizationSession();
  const [query, setQuery] = useContactListQueryState();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const contacts = useContacts({
    enabled: Boolean(session.data?.readiness.ready),
    organizationId: session.data?.organization.id ?? null,
    query,
  });
  const contactPresence = useContactPresence({
    enabled: Boolean(session.data?.readiness.ready),
    organizationId: session.data?.organization.id ?? null,
  });
  const selectedContacts = useMemo(
    () =>
      contacts.data?.contacts.filter((contact) => rowSelection[contact.id]) ??
      [],
    [contacts.data?.contacts, rowSelection],
  );
  const selectedContactIds = useMemo(
    () => selectedContacts.map((contact) => contact.id),
    [selectedContacts],
  );

  if (session.isLoading) {
    return (
      <main className="flex flex-1 items-start bg-background">
        <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
          <p className="text-sm text-muted-foreground">Loading contacts.</p>
        </section>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title="Contacts could not be loaded"
            variant="error"
          />
        </div>
      </main>
    );
  }

  if (!session.data) {
    return null;
  }

  if (!session.data.readiness.ready) {
    return <BlockedContacts session={session.data} />;
  }

  const hasContacts = (contactPresence.data?.total ?? 0) > 0;
  const contactPresenceLoaded = Boolean(contactPresence.data);

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-7xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            hasContacts ? (
              <>
              <Button asChild>
                <Link href={routes.contactsImport}>
                  <FileUp aria-hidden="true" data-icon="inline-start" />
                  Import CSV
                </Link>
              </Button>
              <Button
                onClick={() => {
                  void contacts.refetch();
                }}
                type="button"
                variant="outline"
              >
                <RefreshCw aria-hidden="true" data-icon="inline-start" />
                Refresh
              </Button>
              </>
            ) : null
          }
          description="Review imported customers, find contacts ready for SMS, and catch data issues before campaigns."
          eyebrow="Contacts"
          title="Contacts"
        />

        <AppPageContent>
          <AppPageItem asChild>
            <section>
              {contactPresence.isError ? (
                <ItemNotice
                  description={
                    contactPresence.error instanceof Error
                      ? contactPresence.error.message
                      : 'Try refreshing the page.'
                  }
                  title="Contact status could not be checked"
                  variant="error"
                />
              ) : !contactPresenceLoaded || contacts.isLoading ? (
                <TableLoading label="Loading contacts" />
              ) : !hasContacts ? (
                <EmptyState
                  action={
                    <Button asChild>
                      <Link href={routes.contactsImport}>
                        <FileUp aria-hidden="true" data-icon="inline-start" />
                        Import CSV
                      </Link>
                    </Button>
                  }
                  description="Import a customer CSV to validate phone numbers, consent, dedupe results, and suppression checks before your first campaign."
                  icon={UsersRound}
                  title="Import your first contacts"
                  variant="page"
                />
              ) : contacts.isError ? (
                <ItemNotice
                  description={
                    contacts.error instanceof Error
                      ? contacts.error.message
                      : 'Try refreshing the table.'
                  }
                  title="Contacts could not be fetched"
                  variant="error"
                />
              ) : (
                <>
                  <ItemHeader className="items-start">
                    <ItemContent className="gap-2">
                      <ItemTitle className="text-base">Contacts</ItemTitle>
                      <ItemDescription>
                        Filter by SMS readiness and data issues.
                      </ItemDescription>
                    </ItemContent>
                  </ItemHeader>
                  <ContactFilters
                    direction={query.direction}
                    issue={query.issue}
                    onChange={(values) => {
                      setRowSelection({});
                      void setQuery({ page: 1, ...values });
                    }}
                    search={query.search}
                    sort={query.sort}
                    status={query.status}
                  />
                  {contacts.data && contacts.data.contacts.length > 0 ? (
                    <>
                  <ContactListPosition
                    page={contacts.data.page}
                    pageSize={contacts.data.pageSize}
                    total={contacts.data.total}
                  />
                  <ContactBulkActions
                    contactIds={selectedContactIds}
                    onClear={() => setRowSelection({})}
                    organizationId={session.data.organization.id}
                    selectedCount={selectedContactIds.length}
                  />
                  <ContactsTable
                    contacts={contacts.data.contacts}
                    onRowSelectionChange={setRowSelection}
                    page={contacts.data.page}
                    pageSize={contacts.data.pageSize}
                    rowSelection={rowSelection}
                    selectable
                  />
                  <PaginationControls
                    itemLabel="contacts"
                    onPageChange={(page) => {
                      setRowSelection({});
                      void setQuery({ page });
                    }}
                    page={contacts.data.page}
                    pageSize={contacts.data.pageSize}
                    total={contacts.data.total}
                  />
                    </>
                  ) : (
                    <EmptyState
                      description="Clear or change the filters to see more imported contacts."
                      title="No contacts match these filters"
                    />
                  )}
                </>
              )}
            </section>
          </AppPageItem>
        </AppPageContent>
      </section>
    </main>
  );
}

function ContactListPosition({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-foreground">
        Showing {start}-{end} of {total} contacts
      </span>
      <span className="text-muted-foreground">Page {page} of {totalPages}</span>
    </div>
  );
}
