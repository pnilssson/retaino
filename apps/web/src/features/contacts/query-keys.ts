"use client";

export type ContactListQueryKeyInput = {
  direction: string;
  issue: string;
  page: number;
  search: string;
  sort: string;
  status: string;
};

export const contactsQueryKeys = {
  all: ['contacts'] as const,
  organization: (organizationId: string) =>
    [...contactsQueryKeys.all, organizationId] as const,
  detail: (organizationId: string, contactId: string) =>
    ['contact', organizationId, contactId] as const,
  importDetail: (organizationId: string, importId: string) =>
    ['contact-import', organizationId, importId] as const,
  presence: (organizationId: string) =>
    [...contactsQueryKeys.organization(organizationId), 'presence'] as const,
  list: (organizationId: string, query: ContactListQueryKeyInput) =>
    [
      ...contactsQueryKeys.organization(organizationId),
      {
        direction: query.direction,
        issue: query.issue,
        page: query.page,
        search: query.search,
        sort: query.sort,
        status: query.status,
      },
    ] as const,
};
