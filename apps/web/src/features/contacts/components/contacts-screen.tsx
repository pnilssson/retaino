"use client";

import {
  UsersRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useMemo,
  useState,
} from 'react';
import type { RowSelectionState } from '@tanstack/react-table';
import { ItemNotice } from '@/components/item-notice';
import {
  EmptyState,
  PaginationControls,
} from '@/components/data-table';
import { AppPageLoading } from '@/features/appshell/components/app-page-loading';
import { AppPageHeader } from '@/features/appshell/components/app-page-header';
import { ContentSection } from '@/features/appshell/components/content-section';
import { useContactListQueryState } from '@/features/contacts/hooks/use-contact-list-query-state';
import { useContactPresence } from '@/features/contacts/hooks/use-contact-presence';
import { useContacts } from '@/features/contacts/hooks/use-contacts';
import { useOrganizationSession } from '@/features/onboarding/hooks/use-organization-session';
import { BlockedContacts } from './blocked-contacts';
import { ContactBulkActions } from './contact-bulk-actions';
import type { ContactSortKey } from './contact-columns';
import { ContactFilters } from './contact-filters';
import { ContactPageActions } from './contact-page-actions';
import { ContactsTable } from './contacts-table';

export function ContactsScreen() {
  const t = useTranslations('Contacts');
  const common = useTranslations('Common');
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
  const sort = contactSortKey(query.sort);
  const direction = query.direction === 'asc' ? 'asc' : 'desc';
  const handleSort = (nextSort: ContactSortKey) => {
    const nextDirection =
      nextSort === sort
        ? direction === 'asc'
          ? 'desc'
          : 'asc'
        : defaultContactSortDirection(nextSort);

    setRowSelection({});
    void setQuery({
      direction: nextDirection,
      page: 1,
      sort: nextSort,
    });
  };

  if (session.isLoading) {
    return <AppPageLoading className="max-w-7xl" />;
  }

  if (session.isError) {
    return (
      <main className="flex flex-1 items-center justify-center bg-background px-5 py-10" id="main-content">
        <div className="max-w-lg">
          <ItemNotice
            description={session.error.message}
            title={t('contactsLoadErrorTitle')}
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
  const phoneCountryCode = session.data.profile?.countryCode ?? 'SE';

  return (
    <main className="flex flex-1 items-start bg-background" id="main-content">
      <section className="mx-auto grid w-full max-w-7xl content-start gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <AppPageHeader
          actions={
            hasContacts ? (
              <ContactPageActions
                organizationId={session.data.organization.id}
                phoneCountryCode={phoneCountryCode}
              />
            ) : null
          }
          title={t('contactsTitle')}
        />

        <div className="grid gap-5">
          {contactPresence.isError ? (
            <ContentSection asChild>
              <section>
                <ItemNotice
                  description={
                    contactPresence.error instanceof Error
                      ? contactPresence.error.message
                      : common('tryAgainSoon')
                  }
                  title={t('contactStatusCheckErrorTitle')}
                  variant="error"
                />
              </section>
            </ContentSection>
          ) : !contactPresenceLoaded ? (
            <ContentSection framed={false}>
              <ContactsTable
                contacts={[]}
                direction={direction}
                isLoading
                onSort={handleSort}
                selectable
                sort={sort}
              />
            </ContentSection>
          ) : !hasContacts ? (
            <EmptyState
              action={
                <ContactPageActions
                  organizationId={session.data.organization.id}
                  phoneCountryCode={phoneCountryCode}
                />
              }
              description={t('importFirstContactsDescription')}
              framed
              icon={UsersRound}
              title={t('importFirstContactsTitle')}
              variant="page"
            />
          ) : contacts.isError ? (
            <ContentSection asChild>
              <section>
                <ItemNotice
                  description={
                    contacts.error instanceof Error
                      ? contacts.error.message
                      : t('contactsFetchFallbackError')
                  }
                  title={t('contactsFetchErrorTitle')}
                  variant="error"
                />
              </section>
            </ContentSection>
          ) : (
            <ContentSection framed={false}>
                <>
                  <ContactFilters
                    issue={query.issue}
                    onChange={(values) => {
                      setRowSelection({});
                      void setQuery({ page: 1, ...values });
                    }}
                    search={query.search}
                    status={query.status}
                  />
                  {contacts.data && contacts.data.contacts.length > 0 ? (
                    <>
                  <ContactsTable
                    contacts={contacts.data.contacts}
                    direction={direction}
                    isLoading={contacts.isFetching}
                    onRowSelectionChange={setRowSelection}
                    onSort={handleSort}
                    rowSelection={rowSelection}
                    selectable
                    sort={sort}
                    tableActions={
                      <ContactBulkActions
                        contactIds={selectedContactIds}
                        onClear={() => setRowSelection({})}
                        organizationId={session.data.organization.id}
                        selectedCount={selectedContactIds.length}
                      />
                    }
                  />
                  <PaginationControls
                    itemLabel={t('contactsPaginationLabel')}
                    onPageChange={(page) => {
                      setRowSelection({});
                      void setQuery({ page });
                    }}
                    page={contacts.data.page}
                    pageSize={contacts.data.pageSize}
                    total={contacts.data.total}
                  />
                    </>
                  ) : contacts.isLoading ? (
                    <ContactsTable
                      contacts={[]}
                      direction={direction}
                      isLoading
                      onSort={handleSort}
                      selectable
                      sort={sort}
                    />
                  ) : (
                    <EmptyState
                      description={t('emptyFilteredContactsDescription')}
                      title={t('emptyFilteredContactsTitle')}
                    />
                  )}
                </>
            </ContentSection>
          )}
        </div>
      </section>
    </main>
  );
}

function contactSortKey(value: string): ContactSortKey {
  if (
    value === 'createdAt' ||
    value === 'lastBookingAt' ||
    value === 'lastContactedAt' ||
    value === 'name'
  ) {
    return value;
  }

  return 'createdAt';
}

function defaultContactSortDirection(sort: ContactSortKey) {
  return sort === 'name' ? 'asc' : 'desc';
}
