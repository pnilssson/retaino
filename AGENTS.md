# AGENTS

Read the relevant docs before starting work.

## Project

This repository is the Retaino monorepo.

- Architecture and project conventions: `docs/architecture.md`

## Standards

- Every finding is a fix. If you find something wrong, fix it now.
- Never revert working code to avoid a build step. If native code needs rebuilding, say so. The user will rebuild.
- Never leave unused code, files, imports, or dependencies behind. If something is no longer used, delete it immediately.
- When asked to remove a concept, remove it completely. Do not preserve the
  deleted idea as negative tests, comments, docs, renamed helpers, or
  explanatory artifacts unless the user explicitly asks for a guardrail.
- Dependencies used in code must be declared in the correct `package.json`. Do not rely on hoisting.
- Prefer simple names when they stay clear. Avoid adding hyphens or compound names unless they improve clarity or match existing conventions.

## Guardrails

- Never use em dashes. Commas or rewrite.
- Never design cards inside cards. Use sections, bands, lists, tables, or split
  layouts instead of nesting framed surfaces.

## Tests

- Do not add tests to `apps/web`.
- Put tests for non-web application logic in the matching package-level
  `test` folder, such as `apps/api/test`, `packages/shared/test`, or
  `packages/db/test`.
- Keep test folders separate from implementation files and mirror the matching
  `src` structure. Do not colocate `*.test.*` or `*.spec.*` files next to
  production source files.

### Technical

- Web uses Next.js on Vercel.
- API uses Hono on Cloudflare Workers.
- Auth uses Clerk.
- Database uses Neon Postgres with Drizzle.
- Never manually edit migration SQL or migration metadata. Update the Drizzle
  schema, then generate migrations with the project migration command.
- Payments use Polar.
- Background jobs use Inngest.
- Long-running operations must run in background jobs, not inside HTTP requests.
- Use TanStack Form for application forms. Do not hand-roll form state,
  validation, touched state, or submit handling with local React state unless
  the user explicitly asks for a one-off exception.
- Web feature `components` folders contain `.tsx` component files only. Feature
  `hooks` folders contain hook files named `use-*.ts` or `use-*.tsx` only.
  Pure feature `.ts` helpers, constants, formatters, query keys, and types live
  directly in the feature folder. Do not add feature `lib` folders for now.
  Shared hooks used by multiple features live in `apps/web/src/hooks`.
- No duplicate functions, constants, or types. Shared logic belongs in `packages/shared`.

## Commits

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`.
Subject lines under 72 characters.
