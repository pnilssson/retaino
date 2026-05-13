"use client";

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

export function useContactListQueryState() {
  return useQueryStates({
    direction: parseAsString.withDefault('desc'),
    issue: parseAsString.withDefault('all'),
    page: parseAsInteger.withDefault(1),
    search: parseAsString.withDefault(''),
    sort: parseAsString.withDefault('createdAt'),
    status: parseAsString.withDefault('all'),
  });
}

export type ContactListQueryState = ReturnType<
  typeof useContactListQueryState
>[0];
