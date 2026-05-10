"use client";

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, FileUp, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import {
  parseAsInteger,
  parseAsString,
  useQueryStates,
} from 'nuqs';
import {
  type ContactImportListResponse,
  type ContactListResponse,
} from '@retaino/shared/contracts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemTitle,
} from '@/components/ui/item';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { useApi } from '@/features/onboarding/hooks/use-api';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { routes } from '@/lib/routes';
import { BlockedContacts } from './blocked-contacts';
import { ContactFilters } from './contact-filters';
import { ContactsTable } from './contacts-table';
import {
  EmptyState,
  PaginationControls,
  TableLoading,
} from './data-table';

export function ContactsScreen() {
  const api = useApi();
  const session = useOrganizationSession();
  const [query, setQuery] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    search: parseAsString.withDefault(''),
    status: parseAsString.withDefault('all'),
    issue: parseAsString.withDefault('all'),
    importedFrom: parseAsString.withDefault('all'),
    sort: parseAsString.withDefault('createdAt'),
    direction: parseAsString.withDefault('desc'),
  });
  const imports = useQuery({
    enabled: Boolean(session.data?.readiness.ready),
    queryKey: ['contact-imports'],
    queryFn: () =>
      api.get<ContactImportListResponse>('/v1/contact-imports'),
  });
  const latestImport = imports.data?.imports[0] ?? null;
  const contacts = useQuery({
    enabled: Boolean(
      session.data?.readiness.ready &&
        (query.importedFrom !== 'latest' || latestImport?.id),
    ),
    queryKey: [
      'contacts',
      query.page,
      query.search,
      query.status,
      query.issue,
      query.importedFrom,
      latestImport?.id,
      query.sort,
      query.direction,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: '25',
        sort: query.sort,
        direction: query.direction,
      });

      if (query.search) params.set('search', query.search);
      if (query.status !== 'all') params.set('status', query.status);
      if (query.issue !== 'all') params.set('issue', query.issue);
      if (query.importedFrom === 'latest' && latestImport?.id) {
        params.set('importedFrom', latestImport.id);
      }

      return api.get<ContactListResponse>(`/v1/contacts?${params}`);
    },
  });
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

  return (
    <main className="flex flex-1 items-start bg-background">
      <section className="mx-auto grid w-full max-w-7xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            <>
              <Button asChild>
                <Link href={routes.contactsImport}>
                  <FileUp aria-hidden="true" />
                  Import CSV
                </Link>
              </Button>
              <Button
                onClick={() => {
                  void contacts.refetch();
                  void imports.refetch();
                }}
                type="button"
                variant="outline"
              >
                <RefreshCw aria-hidden="true" />
                Refresh
              </Button>
            </>
          }
          description="Review imported customers, find contacts ready for SMS, and catch data issues before campaigns."
          eyebrow="Contacts"
          title="Contacts"
        />

        <ItemGroup className="gap-5">
          <Item
            asChild
            className="grid items-stretch gap-5 border-border bg-card px-5 py-5"
          >
            <section>
              <ItemHeader className="items-start">
                <ItemContent className="gap-2">
                  <ItemTitle className="text-base">Contacts</ItemTitle>
                  <ItemDescription>
                    Filter by SMS readiness, import batch, and data issues.
                  </ItemDescription>
                </ItemContent>
              </ItemHeader>
              <ContactFilters
                direction={query.direction}
                importedFrom={query.importedFrom}
                issue={query.issue}
                latestImportAvailable={Boolean(latestImport)}
                onChange={(values) => void setQuery({ page: 1, ...values })}
                search={query.search}
                sort={query.sort}
                status={query.status}
              />

              {contacts.isError ? (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertTitle>Contacts could not be fetched</AlertTitle>
                  <AlertDescription>
                    {contacts.error instanceof Error
                      ? contacts.error.message
                      : 'Try refreshing the table.'}
                  </AlertDescription>
                </Alert>
              ) : contacts.isLoading ? (
                <TableLoading label="Loading contacts" />
              ) : contacts.data && contacts.data.contacts.length > 0 ? (
                <>
                  <ContactsTable contacts={contacts.data.contacts} />
                  <PaginationControls
                    itemLabel="contacts"
                    onPageChange={(page) => void setQuery({ page })}
                    page={contacts.data.page}
                    pageSize={contacts.data.pageSize}
                    total={contacts.data.total}
                  />
                </>
              ) : query.search ||
                query.status !== 'all' ||
                query.issue !== 'all' ||
                query.importedFrom !== 'all' ? (
                <EmptyState
                  description="Clear or change the filters to see more imported contacts."
                  title="No contacts match these filters"
                />
              ) : (
                <EmptyState
                  action={
                    <Button asChild>
                      <Link href={routes.contactsImport}>
                        <FileUp aria-hidden="true" />
                        Import CSV
                      </Link>
                    </Button>
                  }
                  description="Import a customer CSV to validate phone numbers, consent, dedupe results, and suppression checks."
                  title="No contacts imported yet"
                />
              )}
            </section>
          </Item>
        </ItemGroup>
      </section>
    </main>
  );
}
