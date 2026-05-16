# Compliance

Retaino handles marketing recipients, campaign events, booking exports, and
revenue attribution. Treat imported and generated artifacts as sensitive.

This is product and engineering guidance, not legal advice.

## Roles

The customer is the controller for their customer list and campaign purpose.
Retaino is the processor for imported contacts, campaign sends, tracking events,
and reconciliation data.

Organizations are the tenant boundary. Access rules live in
`docs/architecture.md`.

## Legal Bundle

Onboarding requires one organization-level legal agreement. Do not expose a
checklist of legal documents as the main product step.

The legal bundle includes terms or MSA, DPA, subprocessor list, transfer terms
when needed, and sending policy. Twilio must be disclosed before live sending is
enabled.

Clicking the final setup action records acceptance of the current bundle.
Public versioned legal pages remain available, but onboarding keeps the legal
step compact.

Legal acceptances are append-only audit records. Store organization ID, user ID,
bundle version, bundle hash, document snapshot, accepted time, IP address, and
user agent when available.

`POST /v1/organization/legal` accepts the current bundle. The server chooses the
current manifest and ignores client supplied document versions.

When a material legal document changes, manually bump the bundle version.
Affected organizations see an in-app notice. Imports are blocked until an admin
accepts the current bundle. Campaign sends use the same gate when sending
exists.

Do not add a normal user-facing revoke action.

## Contact Permission

Contact permission attestation belongs in the import flow, not onboarding.

Before processing an import, the user must confirm:

> I confirm these contacts can lawfully receive marketing SMS from this
> organization.

The confirmation covers that recipients are valid marketing contacts, the
customer has a lawful basis, recipients have not opted out, and imported files
do not include sensitive unsupported fields.

Store attestation timestamp and actor user ID on the import record or audit
metadata.

## Opt-Out And Suppression

Every SMS campaign includes forced opt-out instructions. The user does not
choose whether to include opt-out wording.

STOP handling must detect STOP-style replies, add organization-level
suppressions, prevent future sends to suppressed phone numbers, log the event,
and show suppression counts during audience review.

Suppression checks run during launch readiness and immediately before send
execution.

## Data Minimization

For MVP, store only fields needed for import, sending, tracking, and
reconciliation:

- name
- phone
- email
- normalized phone
- normalized email
- phone hash
- email hash
- last booking date when provided
- campaign membership
- delivery, click, opt-out, and reconciliation events

Do not import health notes, journal notes, treatment notes, free-text medical
fields, or other sensitive special-category data. Do not use header-name deny
lists as the safety control.

## Audit

Tenant-scoped audit logs must record organization ID, actor user ID, event type,
resource type, resource ID, timestamp, and relevant metadata.

Log enough to prove sensitive actions: legal acceptance, import metadata,
mapping, validation, dedupe, suppression removal, campaign rules, SMS copy,
launch decisions, provider results, opt-outs, clicks, booking uploads,
reconciliation, and manual attribution changes.

## Retention

MVP retention defaults:

- raw uploaded files: delete after processing and lifecycle-clean stale uploads
- normalized contacts: keep while the organization is active or until deletion
  is requested
- campaign events: keep for reporting and audit during the customer lifecycle
- booking imports: keep only mapped fields needed for attribution and reporting

Retention jobs run outside HTTP requests.

## Security

Minimum requirements:

- authenticated app users
- organization-level authorization on every API request
- `organizationId` on every tenant-owned table
- server-side validation through shared schemas
- no cross-tenant matching, exports, or dashboard aggregation
- signed or unguessable short-link codes
- rate limiting on redirects and upload endpoints
- audit trail for destructive actions and manual attribution changes
