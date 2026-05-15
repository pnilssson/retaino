# Deployment

Retaino has strict environment separation:

- Local development uses development Neon, development Clerk, and Stripe test
  mode.
- Deployed Cloudflare Workers and Vercel environments use production Neon,
  production Clerk, and Stripe live mode.

Do not point deployed environments at development services, and do not point
local development at production services unless this is an explicit one-off
operation.

## Domains

Production API hostname:

- `api.retaino.io`

The API Worker is configured with a Cloudflare Workers Custom Domain in
`apps/api/wrangler.toml`. Cloudflare requires `retaino.io` to be an active
Cloudflare zone before the custom domain can be attached. When the zone is
active, deploying the Worker applies the custom domain.

Cloudflare custom domains create the DNS records and certificates for the Worker
hostname. Do not add a separate `CNAME` record for `api.retaino.io` first,
because Cloudflare rejects custom domains on hostnames with an existing CNAME.

## Cloudflare DNS Setup

1. Add `retaino.io` to the Corely Cloudflare account as a full setup zone.
2. Copy the two assigned Cloudflare nameservers.
3. In one.com, replace the domain nameservers with the assigned Cloudflare
   nameservers.
4. Wait for Cloudflare to mark the zone active.
5. Deploy the API Worker from `apps/api`.
6. Verify `https://api.retaino.io/health`.

## Cloudflare Worker Production Secrets

Set these on the deployed `retaino-api` Worker:

```text
DATABASE_URL
APP_ALLOWED_ORIGINS
CLERK_SECRET_KEY
CLERK_PUBLISHABLE_KEY
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_SUCCESS_URL
STRIPE_CANCEL_URL
STRIPE_RETURN_URL
STRIPE_CHECKOUT_DISPLAY_NAME
STRIPE_PRICE_STARTER_ID
STRIPE_PRICE_GROWTH_ID
STRIPE_PRICE_SCALE_ID
STRIPE_PRICE_CREDITS_500_ID
STRIPE_PRICE_CREDITS_1500_ID
STRIPE_PRICE_CREDITS_5000_ID
```

Production URL values should use the production web origin, for example:

```text
APP_ALLOWED_ORIGINS=https://retaino.io
STRIPE_SUCCESS_URL=https://retaino.io/app/settings/billing/success
STRIPE_CANCEL_URL=https://retaino.io/app/settings/billing
STRIPE_RETURN_URL=https://retaino.io/app/settings/billing
STRIPE_CHECKOUT_DISPLAY_NAME=Retaino
```

Use Stripe live-mode keys, live-mode price IDs, and the live webhook endpoint
signing secret. Do not reuse the local Stripe CLI webhook secret.

## Vercel Local Linking

The GitHub repository can be connected to a Vercel project while this local
checkout is not linked. Local linking creates an untracked `.vercel/` directory
with the Vercel org and project IDs. The directory is gitignored by design.

From this machine:

```powershell
cd apps/web
pnpm exec vercel login
pnpm exec vercel link
pnpm exec vercel env pull .env.local --environment=development --yes
```

If the project name is known, prefer a deterministic link:

```powershell
cd apps/web
pnpm exec vercel link --yes --project <project-name-or-id>
```

After linking, `pnpm exec vercel env ls` and `pnpm exec vercel env pull` will
target the correct Vercel project.

## Vercel Production Environment

Set these on the Vercel production environment for `apps/web`:

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_API_URL=https://api.retaino.io
NEXT_PUBLIC_BILLING_SUCCESS_PATH=/app/settings/billing/success
NEXT_PUBLIC_BILLING_RETURN_PATH=/app/settings/billing
```

Use production Clerk keys only.

## Local Development Environment

Local API secrets live in `apps/api/.dev.vars`.

Local web secrets live in `apps/web/.env.local`.

Database CLI scripts read `packages/db/.env`.

Keep all three files on development resources for normal local work.
