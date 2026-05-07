# Onboarding Compliance Todo

Checked 2026-05-07. Short product plan, not legal advice.

## Users Must Accept

- Terms or MSA.
- DPA for Retaino as processor.
- Subprocessor authorization and notice.
- Transfer terms for any vendor outside EU/EEA.
- SMS marketing attestation.
- Sending policy.

## SMS Attestation Must Cover

- Recipients are the customer's own valid contacts.
- Customer has consent or a valid existing-customer basis.
- Campaigns promote the customer's own similar services.
- No recipient has opted out.
- Every SMS includes a clear opt-out path.
- No health notes, journal notes, or other sensitive imported fields.

## Store

- Keep acceptances in `organization_acceptances`.
- Store `organizationId`, `userId`, `documentType`, `documentVersion`, `acceptedAt`, `ipAddress`, `userAgent`.
- Add immutable document versions with title, type, version, effective date, markdown path, and content hash.
- Require re-acceptance when a material document version changes.

## Let Users Read

- Add read-only legal document pages under `/legal/:type/:version`.
- Link each onboarding acceptance row to the exact version.
- Show accepted document versions later in organization settings.

## Missing Onboarding Work

- Write the actual Terms, DPA, subprocessor notice, transfer terms, sending policy, and attestation text.
- Replace acceptance placeholders with linked document review and explicit accept actions.
- Add an organization settings page for accepted documents.
- Add team invitation after organization profile and compliance are complete.
- Block import and campaign approval until profile and compliance are complete.

## Sources Checked

- GDPR Article 28, processor and subprocessor contract duties.
- European Commission SCC guidance for non-EU/EEA transfers.
- EDPB transfer recommendations.
- Konsumentverket SMS and email marketing rules.
- IMY direct marketing objection guidance.
