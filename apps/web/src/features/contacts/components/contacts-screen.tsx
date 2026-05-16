"use client";

import { AlertCircle, FileUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';
import { canManageOrganizationSetup } from '@retaino/shared/contracts';
import { ItemNotice } from '@/components/item-notice';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { useContacts } from '@/features/contacts/hooks/use-contacts';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { BlockedContacts } from './blocked-contacts';
import { ContactBulkActions } from './contact-bulk-actions';
import { ContactFilters } from './contact-filters';
import { ContactsTable } from './contacts-table';
import {
  EmptyState,
  PaginationControls,
  TableLoading,
} from './data-table';

export function ContactsScreen() {
  const session = useOrganizationSession();
  const [query, setQuery] = useContactListQueryState();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const contacts = useContacts({
    enabled: Boolean(session.data?.readiness.ready),
    organizationId: session.data?.organization.id ?? null,
    query,
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
        <Alert className="max-w-lg" variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Contacts could not be loaded</AlertTitle>
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

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-7xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
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
          }
          description="Review imported customers, find contacts ready for SMS, and catch data issues before campaigns."
          eyebrow="Contacts"
          title="Contacts"
        />

        <AppPageContent>
          <AppPageItem asChild>
            <section>
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

              {contacts.isError ? (
                <ItemNotice
                  description={
                    contacts.error instanceof Error
                      ? contacts.error.message
                      : 'Try refreshing the table.'
                  }
                  title="Contacts could not be fetched"
                  tone="destructive"
                />
              ) : contacts.isLoading ? (
                <TableLoading label="Loading contacts" />
              ) : contacts.data && contacts.data.contacts.length > 0 ? (
                <>
                  <ContactListPosition
                    page={contacts.data.page}
                    pageSize={contacts.data.pageSize}
                    total={contacts.data.total}
                  />
                  {canManageContacts ? (
                    <ContactBulkActions
                      contactIds={selectedContactIds}
                      onClear={() => setRowSelection({})}
                      selectedCount={selectedContactIds.length}
                    />
                  ) : null}
                  <ContactsTable
                    contacts={contacts.data.contacts}
                    onRowSelectionChange={setRowSelection}
                    page={contacts.data.page}
                    pageSize={contacts.data.pageSize}
                    rowSelection={rowSelection}
                    selectable={canManageContacts}
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
              ) : query.search ||
                query.status !== 'all' ||
                query.issue !== 'all' ? (
                <EmptyState
                  description="Clear or change the filters to see more imported contacts."
                  title="No contacts match these filters"
                />
              ) : (
                <EmptyState
                  description="Import a customer CSV to validate phone numbers, consent, dedupe results, and suppression checks."
                  title="No contacts imported yet"
                />
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
