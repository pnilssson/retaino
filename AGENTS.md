# AGENTS

Read the relevant docs before starting work.

## Project

This repository is the Retaino monorepo.

- Architecture and project conventions: `docs/architecture.md`

## Standards

- Every finding is a fix. If you find something wrong, fix it now.
- Never revert working code to avoid a build step. If native code needs rebuilding, say so. The user will rebuild.
- Never leave unused code, files, imports, or dependencies behind. If something is no longer used, delete it immediately.
- Dependencies used in code must be declared in the correct `package.json`. Do not rely on hoisting.
- Prefer simple names when they stay clear. Avoid adding hyphens or compound names unless they improve clarity or match existing conventions.

## Guardrails

- Never use em dashes. Commas or rewrite.
- Never design cards inside cards. Use sections, bands, lists, tables, or split
  layouts instead of nesting framed surfaces.

### Technical

- Web uses Next.js on Vercel.
- API uses Hono on Cloudflare Workers.
- Auth uses Clerk.
- Database uses Neon Postgres with Drizzle.
- Payments use Polar.
- Background jobs use Inngest.
- Long-running operations must run in background jobs, not inside HTTP requests.
- Use TanStack Form for application forms. Do not hand-roll form state,
  validation, touched state, or submit handling with local React state unless
  the user explicitly asks for a one-off exception.
- No duplicate functions, constants, or types. Shared logic belongs in `packages/shared`.

## Commits

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`.
Subject lines under 72 characters.
