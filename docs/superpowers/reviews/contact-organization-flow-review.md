# Contact And Organization Flow Review

> Temporary review artifact. Use this to walk the contact and organization
> flows. When the review is finished, delete this file or condense durable
> decisions into the short docs under `docs/`.

**Goal:** Tighten Retaino's existing contact flow and organization onboarding
flow so they are production-ready, smaller where possible, and aligned with
`AGENTS.md` and the durable docs.

**Scope:** Contact list, contact detail, suppression, CSV import, import
processing, organization creation, active organization selection, onboarding,
readiness gates, and legal acceptance.

**Non-goals:** Campaign flow, billing redesign, booking reconciliation, broad
role redesign, and manual browser walkthroughs unless explicitly requested.

---

## Source Docs

Read these before reviewing code:

- `AGENTS.md`
- `docs/product.md`
- `docs/architecture.md`
- `docs/compliance.md`
- `docs/caching.md`
- `docs/ux/guided-flows.md`

External references checked for this review on 2026-05-22:

- Clerk `useOrganizationList`, organization creation, membership pagination,
  `isLoaded`, and `setActive`: <https://clerk.com/docs/nextjs/reference/hooks/use-organization-list>
- TanStack Form validation and submit state: <https://tanstack.com/form/v1/docs/framework/react/guides/validation>
- TanStack Query query keys and invalidation:
  <https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation>
- OWASP file upload controls: <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>
- OWASP CSV injection background: <https://owasp.org/www-community/attacks/CSV_Injection>
- Cloudflare R2 upload options: <https://developers.cloudflare.com/r2/objects/upload-objects/>
- Cloudflare Workers body streaming and size guidance:
  <https://developers.cloudflare.com/workers/best-practices/workers-best-practices/>

---

## Review Rules

- Every finding should become a fix, not just a note.
- Remove unused code, stale helpers, dead docs, and tests for removed behavior.
- Do not add negative tests for concepts we remove.
- Prefer deleting unnecessary code over abstracting it.
- Extract shared helpers only when they remove real duplication or clarify
  ownership.
- Keep tests package-level. Do not add tests to `apps/web`.
- Keep durable docs short. This review file may be detailed while active, but
  should not survive the review unchanged.

---

## Current Code Inventory

Contact flow:

- Web:
  - `apps/web/src/features/contacts/components/import-panel.tsx`
  - `apps/web/src/features/contacts/components/contact-detail-screen.tsx`
  - `apps/web/src/features/contacts/components/contacts-screen.tsx`
  - `apps/web/src/features/contacts/components/contact-filters.tsx`
  - `apps/web/src/features/contacts/components/contact-bulk-actions.tsx`
  - `apps/web/src/features/contacts/hooks/use-*.ts`
  - `apps/web/src/features/contacts/query-keys.ts`
- API:
  - `apps/api/src/features/contacts/contacts.routes.ts`
  - `apps/api/src/features/contacts/contacts.service.ts`
  - `apps/api/src/features/contacts/contacts.jobs.ts`
  - `apps/api/src/features/contacts/contact-import-processing.ts`
  - `apps/api/src/features/contacts/contact-import-storage.ts`
- Shared and DB:
  - `packages/shared/src/contracts/contacts.ts`
  - `packages/db/src/queries/contacts.ts`
  - matching tests in `apps/api/test/features/contacts` and
    `packages/db/test/queries/contacts.test.ts`

Organization flow:

- Web:
  - `apps/web/src/features/onboarding/components/organization-create-form.tsx`
  - `apps/web/src/features/onboarding/components/organization-required.tsx`
  - `apps/web/src/features/onboarding/components/organization-new-screen.tsx`
  - `apps/web/src/features/onboarding/components/onboarding-screen.tsx`
  - `apps/web/src/features/onboarding/components/flow.tsx`
  - `apps/web/src/features/onboarding/components/*-step.tsx`
  - `apps/web/src/features/onboarding/hooks/use-*.ts`
- API:
  - `apps/api/src/features/organization/organization.routes.ts`
  - `apps/api/src/features/organization/organization.service.ts`
  - `apps/api/src/features/organization/organization.gates.ts`
  - `apps/api/src/features/organization/organization.readiness.ts`
- Shared and DB:
  - `packages/shared/src/contracts/organizations.ts`
  - `packages/shared/src/contracts/legal.ts`
  - `packages/db/src/queries/identity.ts`
  - `packages/db/src/queries/legal-documents.ts`
  - matching tests in `apps/api/test/features/organization`

Large-file review targets:

- `packages/db/src/queries/contacts.ts`
- `apps/web/src/features/contacts/components/import-panel.tsx`
- `apps/web/src/features/contacts/components/contact-detail-screen.tsx`
- `apps/api/test/features/contacts/contacts.routes.test.ts`
- `packages/shared/src/contracts/contacts.ts`
- `apps/api/src/features/contacts/contacts.routes.ts`
- `apps/web/src/features/onboarding/components/contact-step.tsx`

---

## Requirements Matrix

| ID | Source | Requirement | Status | Notes |
| --- | --- | --- | --- | --- |
| RM-01 | `AGENTS.md`, `docs/architecture.md` | Product data is organization-scoped. Server routes resolve the active Clerk organization and pass internal `organizationId` into queries. | Implemented | Contact and organization routes use `c.get('organization').id`; request body organization IDs are not part of the reviewed contracts. |
| RM-02 | `docs/product.md` | Contact import supports CSV upload, field mapping, validation, dedupe, suppression checks, and permission attestation. | Implemented | Static pass still needs to verify count semantics and retry behavior in detail. |
| RM-03 | `docs/compliance.md` | Contact permission attestation is required in import, recorded with actor and timestamp, and imports are blocked until legal acceptance is current. | Implemented | API requires `permissionAttestation: true` and gates imports through organization readiness. |
| RM-04 | `docs/architecture.md`, `docs/product.md` | Contact import processing runs as background work, not inside the HTTP request. | Fixed | Upload route stores the file and enqueues Inngest processing. It rejects clearly oversized multipart requests before parsing and validates only a small CSV sample before storing the file. |
| RM-05 | `docs/compliance.md` | Store only MVP contact fields and do not intentionally import sensitive unsupported data. | Implemented | Import mapping is limited to supported fields. Static pass should confirm UI copy keeps this clear. |
| RM-06 | `docs/compliance.md` | IP addresses are stored only for legal acceptance evidence, not contact or campaign operational events. | Implemented | Organization legal acceptance stores `cf-connecting-ip`; contact flow does not store request IP data. |
| RM-07 | `docs/caching.md` | Contact query keys include active organization ID and all server-visible list inputs. | Implemented | Contact keys include org ID, filters, sort, direction, and page. Page size is fixed in the hook. |
| RM-08 | `docs/caching.md`, TanStack Query | Organization session cache must not leak or flash stale data across active organization switches. | Fixed | OF-01 scoped organization session query data by active Clerk organization ID. |
| RM-09 | `docs/architecture.md` | Clerk owns organization membership, invitations, active organization selection, and base roles. Retaino does not add a local membership mirror in MVP. | Implemented | Web uses Clerk `useOrganizationList`; server uses active organization context. |
| RM-10 | Clerk docs | `useOrganizationList` consumers explicitly request `userMemberships` and handle `isLoaded` during org changes. | Implemented | Current components request memberships and handle loading states. |
| RM-11 | `docs/architecture.md` | Members can build, test, send, and review campaigns after setup; organization setup, legal acceptance, billing mutation, and team administration stay role-gated. | Fixed | Organization profile and legal routes require `canManageOrganizationSetup`; operational contact routes and controls are member-accessible after readiness gates. |
| RM-12 | `docs/compliance.md` | Legal acceptance records server-chosen bundle, organization ID, user ID, accepted time, IP address, and user agent. | Implemented | Server ignores client document versions and records request metadata. |
| RM-13 | `docs/ux/guided-flows.md`, `AGENTS.md` | Onboarding and import flows use one framed surface, guided action placement, TanStack Form, and no cards inside cards. | Implemented | Static UI pass still needs to inspect large components for simplification opportunities. |
| RM-14 | `AGENTS.md` | Shared code is extracted only when it removes real duplication or clarifies ownership. | Fixed | AR-01 moved duplicated Clerk session propagation waiting into a small onboarding helper. |
| RM-15 | `AGENTS.md` | Tests stay package-level, no `apps/web` tests, and removed concepts are not kept as negative tests. | Implemented | Existing reviewed tests are package-level. Test relevance pass remains open. |

---

## Contact Flow Checklist

### Product Fit

- [x] Confirm the contact flow supports the core workflow in `docs/product.md`:
  import contacts, attest permission, validate, dedupe, handle suppressions,
  and make eligible contacts available for campaigns.
- [x] Remove generic CRM behavior if it does not support import, suppression,
  campaign readiness, or future attribution.
- [x] Confirm user-facing copy does not expose internal implementation terms.

### Import Security And Privacy

- [x] Confirm imports require authentication and active organization context.
- [x] Confirm the upload route enforces a maximum file size before reading the
  body into memory.
- [x] Confirm uploaded files use generated storage keys, not user filenames.
- [x] Confirm raw uploads are private and deleted after processing or lifecycle
  cleaned.
- [x] Confirm CSV parsing does not run inside the HTTP request after upload.
- [x] Confirm sensitive unsupported data is not intentionally stored.
- [x] Confirm contact permission attestation is required before processing.
- [x] Decide whether CSV export exists. If it exists, review formula-injection
  handling. If it does not exist, do not add tests or docs for it.

### Import Correctness

- [x] Confirm mapping, validation, dedupe, and suppression counts are consistent
  between API, DB, and UI.
- [x] Confirm suppressed contacts that are deleted and re-imported become
  manageable contacts while still respecting suppression.
- [x] Confirm normalized phone, normalized email, phone hash, and email hash are
  created in one shared path and not duplicated in routes or UI code.
- [x] Confirm import processing is idempotent enough for job retry.
- [x] Confirm import result data is count-focused unless the UI truly needs row
  detail.

### Contact Management

- [x] Review contact list filters, sorting, pagination, and empty states.
- [x] Review contact detail edit, delete, suppress, unsuppress, and bulk actions.
- [x] Confirm destructive actions are tenant-scoped and cannot operate by ID
  alone.
- [x] Confirm contact deletion behavior does not break historical campaign
  snapshots.
- [x] Confirm suppression state is clearly represented without duplicate labels
  or contradictory status badges.

### Query And Cache Behavior

- [x] Confirm all contact query keys include the active organization ID.
- [x] Confirm list query keys include every server-visible filter, sort, page,
  and page size.
- [x] Confirm mutations invalidate the relevant list, detail, import, and
  campaign-audience data.
- [x] Remove permanently disabled queries unless they are truly user-triggered.

### Code Shape

- [ ] Review `import-panel.tsx` for mixed responsibilities. Candidate split
  points: upload controls, mapping table, attestation, import result, Sankey
  summary, and step orchestration.
- [ ] Review `contact-detail-screen.tsx` for mixed edit form, detail display,
  suppression actions, and destructive action state.
- [ ] Review `packages/db/src/queries/contacts.ts` for query groups that could
  move into focused modules only if ownership becomes clearer.
- [ ] Remove duplicated formatting, status mapping, validation, and query-key
  helpers.
- [ ] Keep web forms on TanStack Form and data fetching on TanStack Query.

### Tests

- [x] Keep API and DB tests focused on behavior that exists.
- [x] Remove tests for removed concepts instead of keeping negative coverage.
- [x] Add package-level tests only for fixes that touch API, DB, shared
  contracts, import processing, or organization logic.
- [x] Do not add `apps/web` tests.

---

## Organization Flow Checklist

### Product Fit

- [ ] Confirm onboarding collects only what `docs/product.md`,
  `docs/compliance.md`, and sender setup need.
- [ ] Remove onboarding fields that are not used by legal acceptance, billing,
  sender compliance defaults, or organization identity.
- [ ] Confirm onboarding ends with legal acceptance and routes to overview.
- [ ] Confirm user-facing copy consistently says "workspace" or "organization"
  based on product intent, without leaking Clerk terminology.

### Clerk Organization Flow

- [ ] Confirm custom organization creation follows Clerk's current
  `useOrganizationList` model: wait for `isLoaded`, call `createOrganization`,
  call `setActive`, and handle `isLoaded` changing during active organization
  switches.
- [ ] Confirm membership lists explicitly request `userMemberships`.
- [ ] Confirm users with existing memberships can select an organization without
  being forced to create a new one.
- [ ] Confirm invited users can enter via Clerk invitation flow without Retaino
  creating a duplicate local organization.
- [ ] Confirm Retaino does not maintain a local membership mirror in MVP.

### Server Gates

- [ ] Confirm every organization route resolves the active Clerk organization
  and internal `organizationId` server-side.
- [ ] Confirm request body organization IDs are ignored or rejected.
- [ ] Confirm operational contact and campaign actions are member-accessible
  after readiness gates.
- [ ] Confirm organization setup, legal acceptance, billing mutation, and team
  administration remain role-gated.
- [ ] Confirm readiness gates are centralized and not duplicated across routes.

### Legal Acceptance

- [ ] Confirm legal acceptance records the server-chosen bundle, user ID,
  organization ID, timestamp, user agent, and legal acceptance IP address.
- [ ] Confirm campaign and contact operational events do not store request IP
  data.
- [ ] Confirm old legal bundle versions are not user-facing in onboarding.
- [ ] Confirm legal copy stays compact and links to public versioned legal docs.

### Onboarding UI And Forms

- [ ] Confirm each onboarding step has one clear decision group.
- [ ] Confirm guided-flow action placement follows `docs/ux/guided-flows.md`.
- [ ] Confirm forms use TanStack Form validation and submit state.
- [ ] Confirm disabled and loading states do not trap the user.
- [ ] Confirm validation messages are specific and user-facing.
- [ ] Confirm copied company, contact, and billing fields do not duplicate
  sender setup fields unnecessarily.

### Code Shape

- [ ] Review `organization-create-form.tsx` and organization-required flow for
  duplicated create/select/session-propagation logic.
- [ ] Review onboarding step components for repeated field controls that should
  move to a small local helper only if it reduces real duplication.
- [ ] Review `organization.gates.ts`, `organization.readiness.ts`, and
  `organization.service.ts` for overlapping readiness concepts.
- [ ] Remove unused constants, routes, hooks, and stale copy.

### Tests

- [ ] Keep organization API tests focused on gates, readiness, profile update,
  and legal acceptance behavior.
- [ ] Remove tests for organization behaviors that the product no longer has.
- [ ] Add package-level coverage only when server behavior changes.

---

## Review Passes

### Pass 1: Requirements Matrix

- [x] Build a short matrix from `AGENTS.md` and the durable docs.
- [x] Mark each contact and organization requirement as `implemented`,
  `missing`, `unclear`, or `deferred`.
- [x] Turn every `missing` or `unclear` item into a finding with a proposed fix.

### Pass 2: Static Contact Review

- [x] Walk contact import from upload through background processing and result
  display.
- [x] Walk contact list, detail, suppression, deletion, and bulk actions.
- [x] Record findings in the table below.

### Pass 3: Static Organization Review

- [ ] Walk new user, no-organization, existing-organization, invitation, and
  completed-onboarding paths.
- [ ] Walk server readiness gates and legal acceptance.
- [ ] Record findings in the table below.

### Pass 4: Deletion And Architecture Review

- [ ] Look for unused routes, hooks, helpers, tests, schemas, and docs.
- [ ] Look for duplicate logic across contact import, contact management, and
  onboarding forms.
- [ ] Look at large files and split only when the split creates clearer
  ownership.

### Pass 5: Fixes And Verification

- [ ] Fix findings in small commits.
- [ ] Update durable docs only when the product or architecture decision changes.
- [ ] Run targeted tests after each server-side fix.
- [ ] Run final verification:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

---

## Findings

| ID | Severity | Flow | Status | Finding | Proposed fix | Files |
| --- | --- | --- | --- | --- | --- | --- |
| CF-01 | Cleanup | Contact | Fixed | Contact route tests kept explicit 404 assertions for import routes that were removed. | Delete the stale negative test and keep the positive list/import route tests focused on existing behavior. | `apps/api/test/features/contacts/contacts.routes.test.ts` |
| CF-02 | P2 | Contact | Fixed | Contact management UI hid bulk actions, row selection, edit, suppress, unsuppress, and delete behind organization setup permissions even though member contact operations are allowed by the API and product rules. | Remove stale admin gating from contact management UI after readiness gates pass. | `apps/web/src/features/contacts/components/contacts-screen.tsx`, `apps/web/src/features/contacts/components/contact-detail-screen.tsx` |
| CF-03 | Cleanup | Contact | Fixed | Bulk contact mutations invalidated all contact caches instead of the active organization contact cache. | Pass the active organization ID into bulk hooks and invalidate `contactsQueryKeys.organization(organizationId)`. | `apps/web/src/features/contacts/components/contact-bulk-actions.tsx`, `apps/web/src/features/contacts/hooks/use-bulk-delete-contacts.ts`, `apps/web/src/features/contacts/hooks/use-bulk-suppress-contacts.ts` |
| CF-04 | P2 | Contact | Fixed | The import upload route parsed multipart form data before checking declared request size and copied the full CSV into memory before writing to R2. | Reject oversized declared requests before `formData()`, validate only a small CSV sample, and store the `File` directly in R2. | `apps/api/src/features/contacts/contacts.routes.ts`, `apps/api/test/features/contacts/contacts.routes.test.ts` |
| CF-05 | P2 | Contact | Fixed | Contact mutations refreshed contact caches but left campaign audience previews stale, so import, edit, delete, suppress, or unsuppress actions could show outdated eligible counts. | Add a contact cache helper that invalidates both active-organization contact queries and campaign audience preview queries. | `apps/web/src/features/contacts/contact-cache.ts`, `apps/web/src/features/campaigns/query-keys.ts`, `apps/web/src/features/contacts/hooks/use-*.ts` |
| OF-01 | P3 | Organization | Fixed | Organization session data used one global TanStack Query key, so active-organization switches could briefly reuse stale setup/readiness data. | Scope organization session query data by active Clerk organization ID while keeping broad invalidation by prefix. | `apps/web/src/features/onboarding/hooks/use-organization-session.ts`, `apps/web/src/features/onboarding/hooks/use-create-current-organization-legal-acceptance.ts` |
| AR-01 | Cleanup | Architecture | Fixed | Clerk session propagation waiting was duplicated in organization creation, organization selection, and app shell organization switching. | Move the tiny wait helper to the onboarding feature root and reuse it from the three call sites. | `apps/web/src/features/onboarding/session-propagation.ts`, `apps/web/src/features/onboarding/components/organization-create-form.tsx`, `apps/web/src/features/onboarding/components/organization-required.tsx`, `apps/web/src/features/appshell/hooks/use-organization-switcher.ts` |
| DOC-01 |  | Docs | Open |  |  |  |

Status values: `Open`, `Fixed`, `Deferred`, `Not a bug`.

Severity values: `P1`, `P2`, `P3`, `Cleanup`.

---

## Cleanup Rule

Before this branch is merged, remove this review file or replace it with short
durable guidance in the main docs. Do not leave a long review log in the final
documentation set.
