# Compliance

Retaino handles marketing recipients, campaign events, manual booking reports,
future booking exports, and revenue reporting. Treat imported and generated
artifacts as sensitive.

This is product and engineering guidance, not legal advice.

## Roles

The customer is the controller for their customer list and campaign purpose.
Retaino is the processor for imported contacts, campaign sends, tracking events,
manual booking reports, and future reconciliation data.

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
accepts the current bundle. Campaign sends use the same gate.

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

For MVP, store only fields needed for import, sending, tracking, and manual
booking reports:

- name
- phone
- email
- normalized phone
- normalized email
- phone hash
- email hash
- last booking date when provided
- campaign membership
- delivery, click, opt-out, and reported booking events

Do not import health notes, journal notes, treatment notes, free-text medical
fields, or other sensitive special-category data. Do not use header-name deny
lists as the safety control.

## Audit

Tenant-scoped audit trails must record organization ID, event type, resource
type, resource ID, timestamp, and relevant metadata. Actor user ID is required
for user-driven actions and nullable for provider callbacks, public tracking
redirects, and background jobs.

IP addresses are stored only for legal acceptance evidence. Do not store request
IP data on campaign audit logs, public tracking clicks, provider callbacks, or
campaign operational events unless a later legal review creates a specific
retention requirement.

Use `audit_logs` for user-driven decisions and administrative actions: legal
acceptance, import metadata, mapping, validation, dedupe, suppression removal,
campaign rules, SMS copy, launch decisions, manual booking reports, and future
booking reconciliation changes.

Use event tables as the audit trail for operational campaign activity:
provider results in `campaign_message_events`, opt-outs and replies through
message events plus suppressions, and clicks in `click_events`.

## Retention

MVP retention defaults:

- raw uploaded files: delete after processing and lifecycle-clean stale uploads
- normalized contacts: keep while the organization is active or until deletion
  is requested
- campaign events: keep for reporting and audit during the customer lifecycle
- manual booking reports: keep only fields needed for outcome reporting
- future booking imports: keep only mapped fields needed for attribution and
  reporting

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
- audit trail for destructive actions and manual booking report changes
