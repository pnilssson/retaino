# Tenancy

Retaino is multi-tenant from day one. An organization is the tenant boundary and
represents one customer business. Users can belong to multiple organizations.

## Source of truth

Use Clerk Organizations for:

- authentication
- organization creation
- organization membership
- invitations
- active organization selection
- base organization roles

Retaino mirrors the Clerk organization into the database so product data can use
stable internal foreign keys.

Minimum local records:

- `users`, keyed to Clerk user ID
- `organizations`, keyed to Clerk organization ID

Clerk remains the source of truth for whether a user belongs to an organization.
Do not add a local membership mirror in MVP. Add one later only if audit,
support, or product queries need historical membership snapshots. A future
local mirror must not grant access by itself.

## Signup and invitation rules

Direct signup:

1. User signs up.
2. If the user is not accepting an invitation and has no organization, create a
   default organization.
3. Add the user as organization admin.
4. Mirror the organization and user locally.
5. Set the new organization as active.

Invitation acceptance:

1. User accepts an organization invitation.
2. Clerk adds the user to the invited organization.
3. Retaino mirrors the membership locally.
4. User keeps any existing organizations.
5. User can switch between organizations.

For MVP, keep auto-created one-person organizations visible in the organization
switcher. Do not archive or hide them automatically.

## Active organization

The app always operates inside one active organization. Product screens must
require an active organization before loading organization-owned data.

The active organization controls:

- visible contacts
- imports
- campaigns
- tracking links
- booking uploads
- attribution matches
- suppression lists
- billing
- reports
- audit logs

Do not use user ID as the data ownership boundary. User ID is for actor identity,
not tenant ownership.

## Roles

Use simple Clerk organization roles in MVP:

| Role | Meaning |
| --- | --- |
| `org:admin` | Can manage organization settings, invitations, billing, imports, campaigns, and reports. |
| `org:member` | Can view and work inside the organization, with destructive or billing actions restricted. |

Product code should use shared permission helpers rather than checking role
strings inline in many places.

Future roles can include:

- viewer
- campaign manager
- billing admin
- owner

Do not add these until product behavior needs them.

## Database rules

Every table that stores customer, campaign, tracking, booking, billing, or audit
data must include `organizationId`.

Required tenant-scoped tables include:

- contacts
- suppressions
- imports
- campaigns
- campaign recipients
- message events
- tracking links
- click events
- booking imports
- bookings
- attribution matches
- audit logs
- billing records

Queries must include `organizationId` at the boundary. Shared query functions in
`packages/db` should require organization context instead of accepting it as an
optional filter.

## API rules

Every authenticated API request must:

1. Verify the Clerk user.
2. Resolve the active Clerk organization.
3. Verify membership in that organization.
4. Resolve the internal `organizationId`.
5. Pass `organizationId` into all service and query functions.

The Hono API must not infer tenant context from request body fields. Request body
organization IDs are untrusted and should be ignored or validated against the
authenticated active organization.

For calls from the web app to the API, pass a token that includes the active
organization context. Do not rely only on browser-global session cookie behavior
for tenant-sensitive background fetches.

## Background jobs

Background jobs have no active browser session. Every job payload must include:

- `organizationId`
- initiating `userId` when there is a user actor
- source resource ID, such as import ID, campaign ID, or booking import ID

Jobs must re-read data by `organizationId` and resource ID together. A job must
never process a resource by ID alone.

Tenant-sensitive jobs include:

- CSV import parsing
- dedupe
- suppression filtering
- campaign sending
- provider event processing
- booking reconciliation
- report aggregation
- retention cleanup

## URLs

Use organization context in app routes where it improves clarity, such as:

```text
/app/:orgSlug/campaigns
```

Public tracking links should stay short and recipient-focused:

```text
/r/:code
```

Tracking link lookup must resolve the organization from the stored link record,
not from the URL.

## Billing

Billing is organization-owned. A user can belong to several organizations, but
subscriptions, SMS usage, invoices, and payment status belong to one
organization.

Campaign send approval must check the active organization's billing and sending
eligibility.

## Audit

Audit logs must record both actor and tenant:

- organization ID
- actor user ID
- event type
- resource type
- resource ID
- timestamp
- relevant metadata

Important audited events include organization creation, invitation creation,
role changes, billing changes, import approval, campaign approval, campaign
send, opt-out, booking reconciliation, and manual attribution changes.
