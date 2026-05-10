# Caching

Retaino should use caching to improve perceived speed and avoid avoidable reads,
but the cache must preserve tenant isolation, suppression correctness, and
campaign eligibility correctness. The default for contacts is frontend data
caching first. Backend response caching for contact lists and details is
deferred.

## Cache Layers

### TanStack Query

TanStack Query is the primary cache for authenticated app data. It should own
table responsiveness, detail reuse, mutation invalidation, and background
refreshes.

Contacts screens should use cached data with previous-page behavior so filter,
sort, and pagination changes do not flash empty loading states. Prefer
`placeholderData` or the current TanStack Query equivalent for lists and import
row tables.

### Next Data Cache

The Next data cache is appropriate for public or low-risk reference data.
Authenticated app reads should avoid persistent Next caching unless the key is
explicitly tenant-scoped and the invalidation story is clear.

Good candidates later:

- public legal document pages
- current legal document versions for setup checks
- other stable reference records that are not user-specific

### API Worker Memory

Cloudflare Worker memory is per isolate and not durable. It can reduce repeated
reference lookups inside one hot isolate, but it must not be the source of truth
for tenant-scoped mutable data.

Allowed later with short TTLs and explicit keys:

- current legal document versions
- organization setup reference checks that are read-only and cheap to
  invalidate by TTL

Do not use worker memory for contact lists, contact details, suppression state,
auth decisions, or campaign send eligibility.

### Database And Query Design

Database query design is part of the caching strategy. Before adding backend
caches, make tenant-scoped queries efficient with indexes, selective columns,
stable pagination, and aggregate summaries where needed. Cached incorrect data
is worse than a fast indexed query.

## Contacts Query Keys

All contacts cache keys must include the active Retaino organization ID from the
organization session. Do not key by page data alone, contact ID alone, or import
ID alone because users can switch active organizations.

Use these shapes:

```ts
['contacts', orgId, query]
['contact', orgId, contactId]
['contact-imports', orgId, query]
['contact-import', orgId, importId]
['contact-import-rows', orgId, importId, query]
```

Rules:

- `orgId` is required for every contacts key.
- `query` must be a stable object with normalized primitive values.
- Include every server-visible filter, sort, direction, page, and page size in
  the key.
- Do not include functions, transient UI state, or derived labels in keys.
- Invalidate by prefix when a mutation can affect multiple pages or filters.

## Contacts Staleness

Use modest stale times so navigation feels responsive without hiding recent
changes for long:

| Data | Stale time |
| --- | --- |
| Contacts list | 30 seconds |
| Contact detail | 60 seconds |
| Import list or detail while processing | 10 seconds |
| Import list or detail once terminal | 60 seconds |
| Import rows for terminal imports | 30 seconds |

Import detail should poll only while status is `processing`. Stop polling when
the status is `completed`, `failed`, or `canceled`.

## Contacts Invalidation

Mutation handlers should update the exact detail key when the API returns the
new detail, then invalidate broader list keys.

Contact edit:

- set `['contact', orgId, contactId]` from the response
- invalidate `['contacts', orgId]`

Contact delete:

- remove `['contact', orgId, contactId]`
- invalidate `['contacts', orgId]`

Suppress contact:

- set `['contact', orgId, contactId]` from the response
- invalidate `['contacts', orgId]`
- later, invalidate any campaign audience or send eligibility queries

Unsuppress contact:

- set `['contact', orgId, contactId]` from the response
- invalidate `['contacts', orgId]`
- later, invalidate any campaign audience or send eligibility queries

Upload contact import:

- invalidate `['contact-imports', orgId]`
- seed `['contact-import', orgId, importId]` when the upload response contains
  the import detail

Start import processing:

- set or invalidate `['contact-import', orgId, importId]`
- invalidate `['contact-imports', orgId]`
- invalidate `['contact-import-rows', orgId, importId]`
- invalidate `['contacts', orgId]`
- poll the import detail while processing

Import reaches a terminal status:

- invalidate `['contact-import', orgId, importId]`
- invalidate `['contact-imports', orgId]`
- invalidate `['contact-import-rows', orgId, importId]`
- invalidate `['contacts', orgId]`
- stop polling

## What Must Not Be Cached

Do not cache these in frontend, Next, worker memory, or shared backend response
caches:

- auth decisions
- active organization membership checks
- suppression checks before sends
- audit log writes or reads used as proof of action
- import processing writes
- campaign send eligibility
- provider webhook processing decisions
- any result whose correctness depends on current suppression, consent, or
  membership state

These paths can still use efficient queries and transaction-local reuse, but
they must re-read the current database state when correctness matters.

## Why Backend Contact Caching Is Deferred

Contact lists and details are tenant-scoped, mutable, filter-heavy, and
suppression-sensitive. A backend response cache would need keys for
organization, role gates, search, filters, sort, pagination, import batch, and
suppression-derived status. It would also need broad invalidation after edits,
deletes, suppressions, unsuppressions, imports, and import job completion.

That complexity is not justified yet. The first implementation should improve
frontend query keys, stale times, previous-page rendering, and mutation
invalidation. Backend caching should be revisited only after query metrics show
database reads remain a bottleneck.

## Implementation Order

1. Normalize contacts query keys around `orgId`.
2. Add previous-page behavior for contacts, import lists, and import row tables.
3. Add the stale times listed above.
4. Poll only active processing imports.
5. Tighten mutation invalidation.
6. Measure database query latency and frequency.
7. Consider short TTL backend caches only for low-risk shared reference data.
