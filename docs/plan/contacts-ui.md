# Contacts UI Plan

This temporary plan defines the `/app/contacts` user interface.

## Page Shape

The contacts page should start as a working operations screen, not a landing
page. It should show import actions, latest import status, table filters, and
the contacts table in the first usable view.

If profile or compliance setup is incomplete, show the contacts page in a
blocked state with a clear action to finish setup.

## Contacts List

The first contacts list should show:

- name
- phone/email
- last booking
- last contacted
- latest service when available
- source or import source
- contact status
- import date or import source

Useful filters:

- ready for SMS
- invalid
- suppressed
- missing consent
- imported from latest import

## Table Implementation

Use TanStack Table with shadcn Table for contacts and import row tables.

- TanStack Table handles table logic: columns, sorting state, pagination state,
  filters, visible columns, and row selection when needed.
- shadcn Table handles rendering and styling: `Table`, `TableHeader`,
  `TableBody`, `TableRow`, `TableHead`, and `TableCell`.
- Keep filtering, sorting, and pagination server-side for contacts and import
  rows. Do not load every contact into the browser for client-only table logic.
- Use `nuqs` for URL-backed search, filters, sorting, and pagination state.
- Use TanStack Query to fetch table data from the API and invalidate/refetch
  after imports finish.

If shadcn Table is not present yet, install it with the shadcn CLI and then
compose it from feature code. Do not manually edit generated shadcn files.

## Forms

Use TanStack Form for:

- upload metadata
- CSV mapping
- filters that behave like forms
- any future contact edit forms

Do not hand-roll form state, validation, touched state, or submit handling with
local React state.

## Import UI

The import UI should show:

- file upload action
- detected CSV headers
- first few sample rows
- mapping fields
- `phoneCountryCode`, defaulted from organization `countryCode`
- required and recommended field labels
- warnings for unmapped recommended fields
- process action
- latest import status
- import result counts
- invalid/suppressed/duplicate/skipped row table

Do not use AI for mapping in v1. Manual mapping is the source of truth.

## States

Handle these states explicitly:

- setup blocked
- empty contacts
- upload ready
- upload failed
- mapping required
- processing
- completed
- failed
- contacts loading
- contacts error
- contacts filtered empty

Use shadcn primitives for buttons, inputs, selects, dialogs, items, badges,
progress, alerts, and tables.
