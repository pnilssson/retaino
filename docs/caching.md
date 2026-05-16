# Caching

Caching must preserve tenant isolation, suppression correctness, and campaign
eligibility correctness. Prefer frontend data caching first. Backend response
caching for contacts is deferred.

## Layers

TanStack Query is the primary cache for authenticated app data. It owns table
responsiveness, detail reuse, mutation invalidation, and background refresh.
Use previous-page behavior for contact lists so filter, sort, and pagination
changes do not flash empty loading states.

Next data cache is only for public or low-risk reference data unless keys are
explicitly tenant-scoped and invalidation is clear.

Cloudflare Worker memory is per isolate and not durable. It may cache cheap
read-only reference lookups with short TTLs, but never tenant-scoped mutable
product data.

Before adding backend caches, make tenant-scoped queries efficient with indexes,
selective columns, stable pagination, and aggregate summaries.

## Contacts Query Keys

All contacts cache keys include active Retaino organization ID:

```ts
['contacts', orgId, query]
['contact', orgId, contactId]
['contact-import', orgId, importId]
```

Rules:

- `orgId` is required for every contacts key.
- `query` is a stable object with normalized primitive values.
- Include every server-visible filter, sort, direction, page, and page size.
- Do not include functions, transient UI state, or derived labels.
- Invalidate by prefix when a mutation can affect multiple pages or filters.

## Stale Times

| Data | Stale time |
| --- | --- |
| Contacts list | 30 seconds |
| Contact detail | 60 seconds |
| Current import detail while processing | 10 seconds |
| Current import detail once terminal | 60 seconds |

Import detail polls only while status is `processing`.

## Contacts Invalidation

- Contact edit: set `['contact', orgId, contactId]`, invalidate
  `['contacts', orgId]`.
- Contact delete: remove `['contact', orgId, contactId]`, invalidate
  `['contacts', orgId]`.
- Suppress or unsuppress contact: set detail, invalidate contacts, and later
  invalidate campaign audience or send eligibility queries.
- Start import: set or invalidate `['contact-import', orgId, importId]`, then
  invalidate contacts.
- Terminal import: invalidate import detail and contacts, then stop polling.

## Never Cache

Do not cache these in frontend, Next, worker memory, or backend response caches:

- auth decisions
- active organization membership checks
- suppression checks before sends
- audit log writes or reads used as proof of action
- import processing writes
- campaign send eligibility
- provider webhook processing decisions
- results whose correctness depends on current suppression, consent, or
  membership state

These paths can still use efficient queries and transaction-local reuse, but
must re-read current database state when correctness matters.

## Implementation Order

1. Normalize contacts query keys around `orgId`.
2. Add previous-page behavior for contacts.
3. Add the stale times above.
4. Poll only active processing imports.
5. Tighten mutation invalidation.
6. Measure query latency and frequency.
7. Revisit backend caches only after metrics show database reads are a
   bottleneck.
