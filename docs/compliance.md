# Compliance

Retaino handles marketing recipients, campaign events, booking exports, and
revenue attribution. Treat imported and generated artifacts as sensitive.

This is product and engineering guidance, not legal advice.

## Roles

The customer is the controller for their customer list and campaign purpose.
Retaino is the processor for imported contacts, campaign sends, tracking events,
and reconciliation data.

Organizations are the tenant boundary. Access rules are defined in
`docs/architecture.md`.

## Legal Bundle

Onboarding must require one organization-level legal agreement, not a visible
checklist of required documents. The current legal bundle includes:

- terms or MSA
- DPA
- subprocessor list
- transfer terms when a vendor involves data outside the EU/EEA
- sending policy

Twilio is the MVP SMS provider and should be listed in the subprocessor or
vendor disclosures before live campaign sending is enabled. If Twilio settings
use processing or routing outside the EU/EEA, the transfer terms must cover
that processing before affected organizations can send campaigns.

The onboarding UI should show inline links to the legal bundle documents near
the final setup action. Clicking the final setup button records acceptance of
the current bundle. Public versioned legal pages remain available, but
onboarding must keep the legal step compact.

## Contact Permission Attestation

The campaign attestation is not an onboarding legal document. Move the
confirmation into the contact import flow.

Before processing an import, the user must confirm:

> I confirm these contacts can lawfully receive marketing SMS from this
> organization.

The confirmation covers that:

- recipients are the customer's own customers or valid marketing contacts
- the customer has a lawful basis to send marketing SMS
- the campaign promotes the customer's own similar services when relying on an
  existing-customer exemption
- recipients have not opted out
- imported files do not include health notes, journal notes, or other sensitive
  unsupported fields

Store the attestation timestamp and actor user ID on the contact import record
or import audit metadata.

## Acceptance Records

Legal bundle acceptances are audit records and should be append-only.

Store:

- organization ID
- user ID
- bundle version
- bundle hash
- documents snapshot
- accepted time
- IP address and user agent when available

Use `POST /v1/organization/legal` to accept the current bundle. The server must
choose the current bundle from the legal manifest, compute the bundle hash, and
ignore client supplied document versions.

If a legal document changes materially, manually bump the legal bundle version.
Affected organizations see an in-app notice. Imports are blocked until an admin
accepts the current bundle. Campaign sends should use the same gate when
campaign sending exists. Non-material public legal page changes do not block
product usage.

MVP does not need legal update email notifications. Terms should allow Retaino
to provide notices through the product or published legal pages, and to require
acceptance before imports or sends.

Do not add a normal user-facing revoke action. If an acceptance was made by
mistake, model that later as an internal disputed or superseded state while
keeping the original acceptance record.

## Opt-Out and Suppression

Every SMS campaign must include opt-out instructions. Retaino forces the
required opt-out text as a product rule, not a customer decision. The user does
not choose whether to include opt-out wording.

STOP handling must:

- detect STOP-style replies where provider support exists
- add the recipient to an organization-level suppression list
- prevent future sends to suppressed phone numbers
- log the opt-out event
- show suppression counts during audience review

For the Twilio MVP integration, configure sending so inbound replies can reach
Retaino webhooks. A numeric sender or equivalent Messaging Service setup is
preferred for launch because alphanumeric sender IDs are one-way and cannot
receive STOP replies.

Suppression checks must run before campaign approval and immediately before send
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
lists as a safety control.

## Logging and Audit

Log enough to prove what happened:

- import file metadata
- field mappings
- validation results
- dedupe decisions
- suppression removals
- campaign audience rules
- SMS copy and campaign code
- test send approval
- live send approval
- provider send result
- opt-out event
- short-link click
- booking CSV upload
- reconciliation result
- manual attribution change

Logs must be tenant-scoped and queryable for support and compliance review.

Audit logs must record organization ID, actor user ID, event type, resource type,
resource ID, timestamp, and relevant metadata.

## Retention

MVP should support a default retention policy and make it explicit in terms:

- raw uploaded files: delete after processing; use lifecycle cleanup for stale
  uploads
- normalized contacts: keep while the organization account is active or until
  deletion is requested
- campaign events: keep for reporting and audit during the customer lifecycle
- booking imports: keep only the mapped fields needed for attribution and
  reporting

Retention jobs must run outside HTTP requests.

## Security Requirements

Minimum implementation requirements:

- authenticated app users
- organization-level authorization on every API request
- `organizationId` on every tenant-owned database table
- server-side validation through shared schemas
- no cross-tenant matching, exports, or dashboard aggregation
- signed or unguessable short-link codes
- rate limiting on redirects and upload endpoints
- audit trail for destructive actions and manual attribution changes

## Commercial Guardrails

Pricing must support recurring operations and support:

- fixed monthly platform fee
- per-segment SMS usage
- optional paid attribution or booking integration add-on

Avoid one-time-only pricing. Low-volume customers still create support, storage,
compliance, and link infrastructure costs.
