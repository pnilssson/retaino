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

External references checked for this review:

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

## Contact Flow Checklist

### Product Fit

- [ ] Confirm the contact flow supports the core workflow in `docs/product.md`:
  import contacts, attest permission, validate, dedupe, handle suppressions,
  and make eligible contacts available for campaigns.
- [ ] Remove generic CRM behavior if it does not support import, suppression,
  campaign readiness, or future attribution.
- [ ] Confirm user-facing copy does not expose internal implementation terms.

### Import Security And Privacy

- [ ] Confirm imports require authentication and active organization context.
- [ ] Confirm the upload route enforces a maximum file size before reading the
  body into memory.
- [ ] Confirm uploaded files use generated storage keys, not user filenames.
- [ ] Confirm raw uploads are private and deleted after processing or lifecycle
  cleaned.
- [ ] Confirm CSV parsing does not run inside the HTTP request after upload.
- [ ] Confirm sensitive unsupported data is not intentionally stored.
- [ ] Confirm contact permission attestation is required before processing.
- [ ] Decide whether CSV export exists. If it exists, review formula-injection
  handling. If it does not exist, do not add tests or docs for it.

### Import Correctness

- [ ] Confirm mapping, validation, dedupe, and suppression counts are consistent
  between API, DB, and UI.
- [ ] Confirm suppressed contacts that are deleted and re-imported become
  manageable contacts while still respecting suppression.
- [ ] Confirm normalized phone, normalized email, phone hash, and email hash are
  created in one shared path and not duplicated in routes or UI code.
- [ ] Confirm import processing is idempotent enough for job retry.
- [ ] Confirm import result data is count-focused unless the UI truly needs row
  detail.

### Contact Management

- [ ] Review contact list filters, sorting, pagination, and empty states.
- [ ] Review contact detail edit, delete, suppress, unsuppress, and bulk actions.
- [ ] Confirm destructive actions are tenant-scoped and cannot operate by ID
  alone.
- [ ] Confirm contact deletion behavior does not break historical campaign
  snapshots.
- [ ] Confirm suppression state is clearly represented without duplicate labels
  or contradictory status badges.

### Query And Cache Behavior

- [ ] Confirm all contact query keys include the active organization ID.
- [ ] Confirm list query keys include every server-visible filter, sort, page,
  and page size.
- [ ] Confirm mutations invalidate the relevant list, detail, import, and
  campaign-audience data.
- [ ] Remove permanently disabled queries unless they are truly user-triggered.

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

- [ ] Keep API and DB tests focused on behavior that exists.
- [ ] Remove tests for removed concepts instead of keeping negative coverage.
- [ ] Add package-level tests only for fixes that touch API, DB, shared
  contracts, import processing, or organization logic.
- [ ] Do not add `apps/web` tests.

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

- [ ] Build a short matrix from `AGENTS.md` and the durable docs.
- [ ] Mark each contact and organization requirement as `implemented`,
  `missing`, `unclear`, or `deferred`.
- [ ] Turn every `missing` or `unclear` item into a finding with a proposed fix.

### Pass 2: Static Contact Review

- [ ] Walk contact import from upload through background processing and result
  display.
- [ ] Walk contact list, detail, suppression, deletion, and bulk actions.
- [ ] Record findings in the table below.

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
| CF-01 |  | Contact | Open |  |  |  |
| OF-01 |  | Organization | Open |  |  |  |
| AR-01 |  | Architecture | Open |  |  |  |
| DOC-01 |  | Docs | Open |  |  |  |

Status values: `Open`, `Fixed`, `Deferred`, `Not a bug`.

Severity values: `P1`, `P2`, `P3`, `Cleanup`.

---

## Cleanup Rule

Before this branch is merged, remove this review file or replace it with short
durable guidance in the main docs. Do not leave a long review log in the final
documentation set.
