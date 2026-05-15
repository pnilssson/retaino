# AGENTS

This file contains Retaino-specific instructions.

## Project

This repository is the Retaino monorepo.

- Architecture and project conventions lives in: `/docs`

## Guardrails

- Never design cards inside cards. Use sections, bands, lists, tables, or split
  layouts instead of nesting framed surfaces.

## Tests

- Do not add tests to `apps/web`.
- Put tests for non-web application logic in the matching package-level `test`
  folder, such as `apps/api/test`, `packages/shared/test`, or
  `packages/db/test`.
- Mirror the matching `src` structure inside test folders.

## Technical

- Web uses Next.js on Vercel.
- API uses Hono on Cloudflare Workers.
- Auth uses Clerk.
- Database uses Neon Postgres with Drizzle.
- Keep local development and deployed production environments strictly
  separated. Local development runs against development resources only:
  development database, development Clerk, and Stripe test mode. Anything
  deployed on Cloudflare or Vercel runs against production resources only:
  production database, production Clerk, and Stripe live mode. Do not point a
  deployed environment at development services, and do not point local
  development at production services unless the user explicitly asks for a
  one-off production operation.
- Never manually edit migration SQL or migration metadata. Update the Drizzle
  schema, then generate migrations with the project migration command.
- Payments use Stripe.
- Background jobs use Inngest.
- Long-running operations must run in Inngest background jobs, not inside HTTP
  requests.
- Use TanStack Form for application forms. Do not hand-roll form state,
  validation, touched state, or submit handling with local React state unless
  the user explicitly asks for a one-off exception.
- Web feature `components` folders contain `.tsx` component files only. Feature
  `hooks` folders contain hook files named `use-*.ts` or `use-*.tsx` only.
  Pure feature `.ts` helpers, constants, formatters, query keys, and types live
  directly in the feature folder. Do not add feature `lib` folders for now.
  Shared hooks used by multiple features live in `apps/web/src/hooks`.
- Shared cross-package logic belongs in `packages/shared`.
