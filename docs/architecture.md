# Architecture Blueprint

This repository is intentionally bootstrapped with **minimal runnable apps** and
shared tooling only. We avoid placeholder "example" business features until real
requirements are defined.

## Monorepo layout

- `apps/web`: Next.js App Router frontend (Vercel-ready)
- `apps/api`: Hono API for Cloudflare Workers
- `packages/db`: Drizzle schema, migrations, query layer (Neon-ready)
- `packages/shared`: cross-app contracts and schemas
- `packages/eslint-config`: reusable ESLint flat configs
- `packages/typescript-config`: reusable TypeScript base configs

## Architecture rules

### API (`apps/api`)

- `src/server.ts` composes routes and global error handling.
- Keep operational endpoints (for example `/health`) separate from authenticated
  product routes.
- Future product code belongs in `src/features/<feature>/`:
  - `<feature>.routes.ts` for thin HTTP handlers
  - `<feature>.service.ts` for business logic
- Provider adapters and shared errors belong in `src/lib/`.
- Request concerns (auth, guards, context) belong in `src/middleware/`.
- Database access must be imported from `packages/db`, not written inline in
  route files.

### Web (`apps/web`)

- Use App Router route groups by intent:
  - `src/app/(marketing)/...`
  - `src/app/(auth)/...`
  - `src/app/(app)/...`
- Feature modules should live under `src/features/<feature>/`.
- Reusable primitives should live under `src/components/ui/`.
- Shared frontend utilities should live under `src/lib/`.

### Data (`packages/db`)

- Keep table definitions in `src/schema/*`.
- Keep reusable query functions in `src/queries/*`.
- Manage schema changes through Drizzle migrations.

### Shared contracts (`packages/shared`)

- Centralize zod schemas and TS contracts here.
- Prefer imports from `@retaino/shared` over re-defining types in each app.

## Runtime and implementation expectations

- Keep long-running or heavy work in background jobs (e.g. Inngest), not
  synchronous request handlers.
- Keep auth/payment/provider-specific code in dedicated adapters/modules.
- Treat uploaded/generated artifacts as sensitive and enforce strict tenant/user
  scoping at query boundaries.
