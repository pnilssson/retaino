# Guided Flow UX Baseline

Retaino uses guided flows when a user must complete a sequence of related
decisions before a meaningful outcome. Onboarding, contact import, and campaign
creation should feel like the same product pattern even when the underlying
data work is different.

## Principles

- Show one decision group at a time.
- Keep progress literal. Every visible step maps to a real step in the flow.
- Let users revisit completed steps before the final action.
- Keep the next action obvious and in the same place.
- Show readiness and consequences before irreversible actions.
- Prefer recognition over memory. Summaries should repeat the important choices.
- Do not nest cards. The flow progress tracker sits above the framed work
  surface. The active step content lives inside one framed work surface.
- Keep operational screens quiet and dense enough to scan. Avoid marketing-style
  panels, oversized type, and decorative layouts.

## Layout

Guided flows use two main regions:

1. A compact top progress tracker above the work surface.
2. The active step content inside the work surface.

Do not add persistent side summaries to guided flows unless there is a specific
workflow reason. The review step is where user choices should be summarized.

The primary next or final action always sits in the bottom-right action row of
the active work surface. Back or secondary navigation sits in the same row on
the bottom left. Do not place the next action directly under an input, table, or
inline content block.

## Step Behavior

- The active step shows only the fields needed for that decision.
- Step descriptions are optional. Use them only when they add information the
  title and fields do not already communicate.
- Previous steps can be opened again without losing entered values.
- The progress tracker shows the current step, total steps, and simple
  completion segments. It is not tab navigation.
- Field validation stays inline and specific.
- Error notices explain what the user can do next.

## Final Actions

Campaign sends, contact imports, and other meaningful operations require a
review or result step.

- Campaign creation should feel continuous: build the campaign, test it, then
  launch it. Draft is an internal persistence state, not the user's main goal.
- Contact import ends at review before starting the background import, then
  changes to a results step while the import runs.
- Onboarding ends with legal acceptance, then routes directly to the overview.

## Implementation Rules

- Forms use TanStack Form for field values, validation, touched state, and
  submission.
- UI state such as the active step may use local React state.
- Shared guided-flow components stay presentational. Feature components own data
  fetching, form logic, validation, and mutations.
- Use `GuidedFlowActions` for guided-flow step actions unless the flow needs a
  stricter local layout for a documented reason.
- Use `textStyles` for headings, body text, muted text, metadata, and errors.
  Available roles are `pageTitle`, `pageDescription`, `sectionTitle`,
  `itemTitle`, `body`, `mutedBody`, `meta`, `metaStrong`, `numeric`, `metric`,
  and `error`.
- Use existing Retaino buttons, labels, inputs, tables, notices, and icons.
