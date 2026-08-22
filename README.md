# Etfe El Boiler — DJ Lwes Ticketing

A customer-facing event page for **DJ Lwes**' *Etfe El Boiler* parties: a live event page with a cover photo, description, and a single **Buy Tickets** button that hands off to a [Grow](https://grow.business) checkout page — Grow owns pricing, quantity, payment, and invoicing from there. The admin side is a small CMS for managing that event content (text, photo, and the Grow link) without touching code.

Dark, underground deep-house visual identity — neon violet glow, film grain, ticket-stub details — built to feel like a real party's site rather than a template.

**Live demo:** [dj-lwes.vercel.app](https://dj-lwes.vercel.app)

> **Heads up — this repo has two very different branches.** This one (`main`) hands off checkout to an external Grow-hosted payment page, per the client's actual business decision partway through the project. The [`paypal-showcase`](https://github.com/EL00SE/DJLwes/tree/paypal-showcase) branch is a frozen snapshot of how the site worked *before* that pivot — a full in-app PayPal checkout with signature-verified webhooks and race-safe inventory — kept alive as its own [live demo](https://dj-lwes-paypal-showcase.vercel.app) with its own isolated database, since it's the more technically demonstrative half of the project. See that branch's own README for details.

## Screenshots

_Run `npm run dev`, visit `http://localhost:3000`, and drop screenshots into a `docs/screenshots` folder (real event content is already seeded, so these can be the real thing rather than placeholders):_

- Current event page (hero + Buy Tickets button)
- Past events gallery
- Admin event list, and the edit form (photo upload, Grow link, "make this live" toggle)

## Features

- **Current event page** — title, description, date/time, location, cover image, and a **Buy Tickets** button linking straight to a Grow-hosted checkout page. Shows a disabled "Tickets coming soon" state until the admin sets a link.
- **Past events gallery** — grid of photos/video per past event.
- **Admin event editor** ([`/admin/events`](#admin-panel)) — list, create, and edit events: title, description, date/time (entered and displayed in Israel local time regardless of the server's own timezone — see [src/lib/format.ts](src/lib/format.ts)), location, cover image (uploaded directly to [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) from the browser), and the Grow buy link. A "make this the live event" toggle atomically demotes whichever event was previously active — see [src/lib/events.ts](src/lib/events.ts).
- **Responsive down to 320px** — hamburger nav below `sm:`, no horizontal overflow anywhere in the range.

### Dormant flows, kept but unused

Two earlier checkout implementations are still fully functional in the codebase — not deleted, just not wired into the homepage:

- **Instant-purchase PayPal checkout** (`EventExperience`/`BuyPanel`, `/api/checkout`, the signature-verified `/api/webhooks/paypal`, and admin approve/decline/refund) — this is the flow the [`paypal-showcase`](https://github.com/EL00SE/DJLwes/tree/paypal-showcase) branch runs live. See that branch's README for the full feature writeup.
- **Free-request-then-approve flow** (`GuestRequestExperience`, the `GuestRequest` model) — an intermediate design built between the PayPal flow and the current Grow-link approach: a customer would submit a request (name, Instagram, phone, headcount) instead of paying, and an approved request was meant to trigger a Grow payment link via their API. That integration was never finished — the simpler "just link straight to a Grow checkout page the admin sets up manually" approach (what `main` does now) made it unnecessary.

Both show up, collapsed, under "Legacy: pre-Grow ticket workflows" in [`/admin`](#admin-panel).

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript, Turbopack)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for admin-uploaded event cover images
- [Zod](https://zod.dev/) for request validation
- Deployed on [Vercel](https://vercel.com/)
- Dormant on this branch, live on [`paypal-showcase`](https://github.com/EL00SE/DJLwes/tree/paypal-showcase): [PayPal Checkout](https://developer.paypal.com/docs/checkout/) (Orders v2 REST API), [Resend](https://resend.com/) email, [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)

## Data model

`Event` → has many `TicketType`, `GalleryItem`, `Order`, and `GuestRequest`. The last three back the dormant flows above; the live Grow-link flow only uses `Event`'s own fields (including `buyLink`). See [prisma/schema.prisma](prisma/schema.prisma).

## Setup

### Prerequisites

- Node.js 20+
- A PostgreSQL database — either run one locally with Docker, or use a free hosted instance (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/storage/postgres))
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store — for admin-uploaded event cover images (see [Vercel Blob setup](#vercel-blob-setup) below)
- A password of your choosing for the [admin panel](#admin-panel) (`ADMIN_PASSWORD`) — no account/signup, just pick one
- Optional, only needed to exercise the dormant flows locally: a [PayPal Developer](https://developer.paypal.com/dashboard/) sandbox app, a [Resend](https://resend.com/) account, a [Meta for Developers](https://developers.facebook.com/) WhatsApp app

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Your Postgres connection string (see below) |
| `ADMIN_PASSWORD` | Pick anything — this is the only thing gating `/admin` |
| `BLOB_READ_WRITE_TOKEN` | See [Vercel Blob setup](#vercel-blob-setup) below — cover-image upload won't work without it |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local dev |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_ENV` / `PAYPAL_WEBHOOK_ID` | Only needed to exercise the dormant PayPal flow — see [`paypal-showcase`](https://github.com/EL00SE/DJLwes/tree/paypal-showcase)'s README |
| `RESEND_API_KEY`, `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Same — only needed for the dormant flows' order-confirmation delivery |

**Local Postgres via Docker** (optional — skip if using a hosted database):

```bash
docker compose up -d
```

This matches the `DATABASE_URL` already in `.env.example`.

### 3. Run migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

`db:seed` creates one active event (shown on the homepage) and two past events (shown under "Past Events") with placeholder art. Edit `prisma/seed.ts` to change any of it, or use [`/admin/events`](#admin-panel) once the server's running.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Log into `/admin`, go to **Manage Events**, edit the seeded event, and paste any URL into the **Buy link** field to see the homepage's button go from "Tickets coming soon" to a working link.

### Vercel Blob setup

1. In your [Vercel dashboard](https://vercel.com/dashboard), open (or create) the project, go to **Storage → Create Database → Blob**, and give it a name.
2. Connect it to this project — Vercel auto-injects a `BLOB_READ_WRITE_TOKEN` (and `BLOB_STORE_ID`/`BLOB_WEBHOOK_PUBLIC_KEY`) into the connected project's Production/Preview environment variables automatically, via OIDC — no manual copying needed for deployments on Vercel itself.
3. For **local dev**, that OIDC handshake doesn't apply (your laptop isn't a Vercel deployment) — open the store's page, use its "`.env.local`" quickstart tab to get a `BLOB_READ_WRITE_TOKEN` value, and paste it into your local `.env`.

## Admin panel

Visit `/admin` and log in with `ADMIN_PASSWORD` (session lasts 7 days, single shared password — no per-person accounts). You'll see:

- **Events** — a card linking to [`/admin/events`](#admin-panel): list every event, create a new one, or edit an existing one's title, description, date/time, location, cover photo, and Grow buy link. Checking "make this the live event" atomically demotes whichever event was previously active.
- **Legacy: pre-Grow ticket workflows** (collapsed by default) — the dormant PayPal order-approval queue and the dormant guest-request queue, kept functional in case anything from before the switch still needs reviewing. Nothing new should land here on a live site, since there's no in-app checkout to generate orders or requests anymore.

## Deployment (Vercel)

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Set up a [Vercel Blob store](#vercel-blob-setup) and connect it to the project.
3. Add `DATABASE_URL` and `ADMIN_PASSWORD` (pick a real one) in the Vercel project's environment variables. `NEXT_PUBLIC_SITE_URL` doesn't need to be set — it auto-detects the deployment's own domain (see [src/lib/site-config.ts](src/lib/site-config.ts)).
4. Run `npx prisma migrate deploy` against the production database once, then `npm run db:seed` for placeholder data (or just use `/admin/events` once deployed).
5. Visit `/admin/events`, edit the live event, and paste in the real Grow checkout link.

## Project structure

```
src/
  app/
    page.tsx                        Current event page (hero + Buy Tickets button)
    past-events/page.tsx            Past events gallery
    admin/page.tsx                  Dashboard: Manage Events card + collapsed legacy queues
    admin/events/page.tsx           List every event
    admin/events/new/page.tsx       Create form
    admin/events/[id]/edit/page.tsx Edit form
    admin/login/page.tsx            Admin login form
    admin/actions.ts                Server actions: login/logout + dormant order approve/decline
    admin/guest-request-actions.ts  Dormant guest-request approve/decline
    api/admin/events/route.ts       Create event
    api/admin/events/[id]/route.ts  Update event
    api/upload/route.ts             Issues Vercel Blob client-upload tokens (admin-gated)
    api/checkout/route.ts           Dormant: creates a PayPal order
    api/webhooks/paypal/route.ts    Dormant: signature-verified PayPal webhook
    api/guest-requests/route.ts     Dormant: submits a guest request
  components/
    site-header.tsx                 Sticky (lg:+) / scrolls-away (below lg:) header with hamburger nav
    event-hero.tsx                  Title/date/location/cover image
    buy-tickets-section.tsx         The live homepage's Buy Tickets button
    event-experience.tsx            Dormant: PayPal ticket list + buy panel
    buy-panel.tsx                   Dormant: PayPal checkout form
    guest-request-experience.tsx, guest-request-panel.tsx  Dormant: free-request flow
    admin/event-form.tsx            Create/edit event form, incl. Blob upload
  lib/
    prisma.ts                       Prisma client singleton
    events.ts                       Slug generation, atomic "set active event", event zod schema
    format.ts                       Formatting + Israel-local datetime-input <-> UTC helpers
    admin-auth.ts                   Password check + signed session-cookie helpers for /admin
    data.ts                         getActiveEvent / getPastEvents
    paypal.ts, fulfill-order.ts, notify.ts, resend.ts, whatsapp.ts, orders.ts  Dormant PayPal-flow code
prisma/
  schema.prisma                     Event / TicketType / GalleryItem / Order / OrderItem / GuestRequest
  seed.ts                           Manual event data (also usable any time via /admin/events)
```

## Planned features

- **Real Grow API integration** — the buy link is currently pasted in by hand after the admin sets pricing/tickets up in Grow's own dashboard. A `GuestRequest`-style flow that calls Grow's API directly to generate a link was scoped out early on (see [Dormant flows](#dormant-flows-kept-but-unused) above) but abandoned once the simpler manual-link approach turned out to be enough for this client's actual needs.
- Multiple simultaneous on-sale events (currently one "active" event at a time)
- Gallery-item management in `/admin` (past-event photos/videos are still seed-only)

## License

See [LICENSE](LICENSE).
