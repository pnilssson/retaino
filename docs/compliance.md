# Compliance

Retaino handles marketing recipients, campaign events, booking exports, and
revenue attribution. Treat all imported and generated artifacts as sensitive.

## Roles

The customer is the controller for their customer list and campaign purpose.
Retaino is the processor for imported contacts, campaign sends, tracking events,
and reconciliation data.

Organizations are the tenant boundary. User access, invitations, active
organization behavior, and role scope are defined in `docs/tenancy.md`.

## Required onboarding accepts

The onboarding flow must require:

- terms or MSA acceptance
- DPA acceptance
- subprocessor list acceptance
- transfer appendix acceptance when a vendor involves data outside the EU/EEA
- campaign attestation that the customer has the right to contact the list
- sending policy acceptance

The campaign attestation must state that:

- recipients are the customer's own customers or valid marketing contacts
- the customer has a lawful basis to send marketing SMS
- the campaign promotes the customer's own similar services when relying on an
  existing-customer exemption
- recipients have not opted out
- every message includes a clear opt-out path

Store who accepted each item, when they accepted it, the organization, IP or
session metadata where appropriate, and the accepted document version.

## Versioned documents

Keep versioned records for:

- terms or MSA
- DPA
- subprocessor list
- transfer appendix
- sending policy
- campaign attestation text

If a document changes materially, require affected organizations to accept the
new version before sending another campaign.

## Opt-out and suppression

Every SMS campaign must include opt-out instructions. STOP handling must:

- detect STOP-style replies where provider support exists
- add the recipient to an organization-level suppression list
- prevent future sends to suppressed phone numbers
- log the opt-out event
- show suppression counts during audience review

Suppression checks must run before campaign approval and immediately before
send execution.

## Data minimization

For MVP, store only the fields needed for import, sending, tracking, and
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

## Logging

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

## Retention

MVP should support a default retention policy and make it explicit in terms:

- raw uploaded files: delete after processing unless needed for a visible import
  history
- normalized contacts: keep while the organization account is active or until
  deletion is requested
- campaign events: keep for reporting and audit during the customer lifecycle
- booking imports: keep only the mapped fields needed for attribution and
  reporting

Retention jobs must run outside HTTP requests.

## Security requirements

Minimum implementation requirements:

- Clerk authentication for app users
- Clerk Organizations for memberships, invitations, active organization, and
  base roles
- organization-level authorization on every API request, using the active
  organization from auth context
- `organizationId` on all database tables that store customer, campaign,
  tracking, or booking data
- server-side validation through shared schemas
- no cross-tenant matching, exports, or dashboard aggregation
- signed or unguessable short-link codes
- rate limiting on redirects and upload endpoints
- audit trail for destructive actions and manual attribution changes

## Commercial guardrails

Use pricing that supports recurring operations and support:

- small fixed monthly platform fee
- per-segment SMS usage
- optional paid attribution or booking integration add-on

Avoid one-time-only pricing. Low-volume customers still create support,
storage, compliance, and link infrastructure costs.

## MVP success metrics

Track these internal KPIs:

- activation to first campaign
- percentage of campaigns with tracked links
- average SMS segments per recipient
- delivery rate
- click-through rate
- opt-out rate
- percentage of campaigns with booking upload
- match rate by attribution class
- attributed revenue
- revenue by confidence level
- gross margin after SMS cost
