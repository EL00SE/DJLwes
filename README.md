# Etfe El Boiler — DJ Lwes Ticketing

A customer-facing event ticketing site for **DJ Lwes**' *Etfe El Boiler* parties: a live event page with real-time ticket availability, a past-events gallery, and a PayPal-powered checkout flow.

Dark, underground deep-house visual identity — neon violet glow, film grain, ticket-stub details — built to feel like a real party's site rather than a template.

**Live demo:** _add your deployed Vercel URL here once shipped_

## Screenshots

_Add screenshots here once you've run the app locally (see [Setup](#setup) below) — e.g. `npm run dev`, visit `http://localhost:3000`, and drop images into a `docs/screenshots` folder:_

- Current event page (hero, tickets, buy panel)
- Buy panel open on mobile (stacked + auto-scroll)
- Past events gallery
- Checkout confirmation

## Features

- **Current event page** — title, description, date/time, location, cover image, and live ticket types with remaining quantity
- **Past events gallery** — grid of photos/video per past event
- **Buy flow** — clicking "Buy" opens a ticket panel (side-by-side on desktop, stacked with auto-scroll on mobile) to collect name, email, and quantity
- **Checkout** — PayPal Checkout (sandbox/test mode) for payment
- **Confirmation** — order summary shown after a successful purchase
- **Inventory safety** — ticket quantities are decremented atomically on payment, guarding against overselling

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript, Turbopack)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [PayPal Checkout](https://developer.paypal.com/docs/checkout/) (Orders v2 REST API, sandbox/test mode)
- [Zod](https://zod.dev/) for request validation
- Deployed on [Vercel](https://vercel.com/)

## Data model

`Event` → has many `TicketType` and `GalleryItem`. `Order` → belongs to an `Event`, has many `OrderItem` (each pointing at a `TicketType`). See [prisma/schema.prisma](prisma/schema.prisma).

There's no admin panel yet (see [Planned features](#planned-features)), so events are seeded manually — edit [prisma/seed.ts](prisma/seed.ts) and re-run the seed command to change what's on the site.

## Setup

### Prerequisites

- Node.js 20+
- A PostgreSQL database — either run one locally with Docker, or use a free hosted instance (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/storage/postgres))
- A [PayPal Developer](https://developer.paypal.com/dashboard/) account (free — used to create a sandbox app for test-mode payments; no real charges)

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
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Create a sandbox app at [developer.paypal.com/dashboard/applications/sandbox](https://developer.paypal.com/dashboard/applications/sandbox) — it gives you both |
| `PAYPAL_ENV` | Leave as `sandbox` for testing; set to `live` (with live keys) when taking real payments |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local dev |

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

`db:seed` creates one active event (shown on the homepage) and two past events (shown under "Past Events") with placeholder art. Edit `prisma/seed.ts` to change any of it.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Clicking "Continue to Payment" redirects to a real PayPal checkout page (sandbox mode, so no real money moves) — log in with a [sandbox test buyer account](https://developer.paypal.com/dashboard/accounts) (created automatically alongside your app) to complete a test purchase.

## Deployment (Vercel)

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Add the same environment variables from `.env` in the Vercel project settings (point `DATABASE_URL` at your production Postgres and `NEXT_PUBLIC_SITE_URL` at your production domain).
3. Run `npm run db:migrate` (or `npx prisma migrate deploy`) against the production database once, then `npm run db:seed` to load your real event data.
4. Create a **live** PayPal app at [developer.paypal.com/dashboard/applications/live](https://developer.paypal.com/dashboard/applications/live), and set `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` to its live credentials and `PAYPAL_ENV=live` in Vercel when you're ready to take real payments.

## Project structure

```
src/
  app/
    page.tsx                 Current event page
    past-events/page.tsx     Past events gallery
    checkout/success/page.tsx  Captures the PayPal order, shows confirmation
    api/checkout/route.ts    Creates the PayPal order
  components/                 UI building blocks (hero, ticket cards, buy panel, gallery)
  lib/                        Prisma client, PayPal client, data access, formatting
prisma/
  schema.prisma               Event / TicketType / GalleryItem / Order / OrderItem
  seed.ts                     Manual event data (no admin panel yet)
scripts/
  generate-placeholder-art.mjs  Regenerates the placeholder cover/gallery art
```

## Planned features

- **Admin panel** — create/edit events, ticket types, and gallery uploads without touching `seed.ts` directly; view and manage orders
- **Digital tickets + receipts** — on a successful purchase: an emailed receipt/order record for the business, and a scannable digital ticket (QR code) per ticket for the customer to show at the door. Needs: a transactional email provider (e.g. Resend/Postmark), a `Ticket` model (one row per admitted person, not per order, each with a unique code + `checkedInAt`), and eventually a door check-in scanner view
- **PayPal webhook** — orders are currently captured synchronously when the buyer lands back on the success page; a `PAYMENT.CAPTURE.COMPLETED` webhook would make fulfillment resilient to the buyer closing their browser mid-redirect
- Customer/business-initiated refunds or order cancellation (there's already an automatic refund if a race for the last ticket is lost — see [src/lib/fulfill-order.ts](src/lib/fulfill-order.ts) — but nothing yet for "I want to cancel my order")
- Multiple simultaneous on-sale events (currently one "active" event at a time)

## License

See [LICENSE](LICENSE).
