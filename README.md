# Retaino

Retaino is a SaaS for SMS-based customer reactivation. Service businesses such as salons, clinics, fitness studios, and workshops import their customer list, send campaigns to customers who haven't booked in a while, and see the bookings and revenue those campaigns win back, not just how many messages were sent.

> **Note:** Retaino is not live.

## Tech Stack

- **Web:** Next.js (App Router) on Vercel
- **API:** Hono on Cloudflare Workers
- **Auth:** Clerk Organizations
- **Database:** Neon Postgres with Drizzle
- **Billing:** Stripe
- **Background jobs:** Inngest
- **SMS:** Twilio
- **Monorepo:** Turborepo and pnpm

Product, architecture, and compliance notes live in [`docs/`](docs).
