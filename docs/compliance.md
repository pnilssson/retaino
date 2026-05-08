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

## Required Documents

Onboarding must require acceptance of:

- terms or MSA
- DPA
- subprocessor list
- transfer terms when a vendor involves data outside the EU/EEA
- sending policy
- campaign attestation

The campaign attestation must confirm that:

- recipients are the customer's own customers or valid marketing contacts
- the customer has a lawful basis to send marketing SMS
- the campaign promotes the customer's own similar services when relying on an
  existing-customer exemption
- recipients have not opted out
- every message includes a clear opt-out path
- imported files do not include health notes, journal notes, or other sensitive
  unsupported fields

## Acceptance Records

Document acceptances are audit records and should be append-only.

Store:

- organization ID
- user ID
- document type
- document version
- content hash
- accepted time
- IP address and user agent when available

If a document changes materially, require affected organizations to accept the
new version before sending another campaign.

Do not add a normal user-facing revoke action. If an acceptance was made by
mistake, model that later as an internal disputed or superseded state while
keeping the original acceptance record.

## Opt-Out and Suppression

Every SMS campaign must include opt-out instructions.

STOP handling must:

- detect STOP-style replies where provider support exists
- add the recipient to an organization-level suppression list
- prevent future sends to suppressed phone numbers
- log the opt-out event
- show suppression counts during audience review

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
- service name when provided
- campaign membership
- delivery, click, opt-out, and reconciliation events

Do not import health notes, journal notes, treatment notes, free-text medical
fields, or other sensitive special-category data. If a CSV contains unsupported
sensitive columns, ignore them and warn the user.

## Logging and Audit

Log enough to prove what happened:

- import file metadata
- field mappings
- validation results
- dedupe decisions
- suppression removals
- segment selection
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

- raw uploaded files: delete after processing unless needed for visible import
  history
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
