# Etfe El Boiler — DJ Lwes Ticketing

A customer-facing event ticketing site for **DJ Lwes**' *Etfe El Boiler* parties: a live event page with real-time ticket availability, a past-events gallery, and a PayPal-powered checkout flow.

Dark, underground deep-house visual identity — neon violet glow, film grain, ticket-stub details — built to feel like a real party's site rather than a template.

**Live demo:** _add your deployed Vercel URL here once shipped_

## Screenshots

_Run `npm run dev`, visit `http://localhost:3000`, and drop screenshots into a `docs/screenshots` folder (real event content is already seeded, so these can be the real thing rather than placeholders):_

- Current event page (hero, tickets, buy panel)
- Buy panel open on mobile — centered in the viewport, header scrolled out of the way
- The hamburger nav open on a small screen
- Past events gallery
- Checkout confirmation

## Features

- **Current event page** — title, description, date/time, location, cover image, and live ticket types with remaining quantity
- **Past events gallery** — grid of photos/video per past event
- **Buy flow** — clicking "Buy" opens a ticket panel: side-by-side on desktop, or on mobile the page smooth-scrolls to center the form in the viewport (the header un-stickies below `lg:` specifically so this centers against the *true* visible viewport, not one a floating header is eating into)
- **Checkout** — PayPal Checkout (sandbox/test mode) for payment
- **Confirmation** — order summary shown after a successful purchase, plus a real confirmation sent to the buyer's choice of email (via [Resend](https://resend.com)) or WhatsApp (via [Meta's WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)) — see [src/lib/notify.ts](src/lib/notify.ts). This is an order confirmation, not yet a scannable admission ticket — see [Planned features](#planned-features)
- **Inventory safety** — ticket quantities are decremented atomically on payment, so two buyers can never both win the same last ticket. If a buyer loses that race *after* paying, they're automatically refunded in full rather than left charged with nothing — see [src/lib/fulfill-order.ts](src/lib/fulfill-order.ts) and the verification script at [scripts/test-oversell-race.ts](scripts/test-oversell-race.ts), which simulates two concurrent buyers racing for the last ticket against a real database
- **Responsive down to 320px** — hamburger nav below `sm:`, 44px touch targets on buy controls, no horizontal overflow anywhere in the range, audited from a 320px phone up through 2560px ultra-wide

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript, Turbopack)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [PayPal Checkout](https://developer.paypal.com/docs/checkout/) (Orders v2 REST API, sandbox/test mode)
- [Resend](https://resend.com/) for order-confirmation email, [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) for WhatsApp delivery
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
- A [Resend](https://resend.com/) account (free tier, no card required) for sending order-confirmation emails
- Optional, for WhatsApp delivery: a [Meta for Developers](https://developers.facebook.com/) app with the WhatsApp product added — see [WhatsApp setup](#whatsapp-setup) below. Skip this and the site still works fine with email-only delivery.

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
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | See [WhatsApp setup](#whatsapp-setup) below — optional, only needed if you want WhatsApp delivery working |

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

### WhatsApp setup

Unlike email, WhatsApp won't let a business send free-form text as the *first* message to someone — only a pre-approved message template. This means WhatsApp delivery needs a bit more one-time setup than email does:

1. Create a [Meta for Developers](https://developers.facebook.com/apps) app, add the **WhatsApp** product, and note the **Phone Number ID** it gives you a test number for.
2. Generate a permanent access token (Meta Business Suite → System Users → your app → generate token with `whatsapp_business_messaging` permission) — temporary tokens from the quickstart page expire in 24 hours, so don't use one of those for `WHATSAPP_ACCESS_TOKEN`.
3. In WhatsApp Manager, create a message template named `ticket_confirmation` (category: **Utility**), language English, with this exact body and 4 variables in this order:
   ```
   Hi {{1}}, your tickets for {{2}} are confirmed! {{3}}. Total: {{4}}. See you there — DJ Lwes
   ```
   Submit it for approval (usually reviewed within a few hours). `src/lib/whatsapp.ts` sends parameters in this order: customer name, event title, ticket summary (e.g. "2 x General Admission"), total price.
4. While your app is in development mode, WhatsApp only delivers to numbers you've explicitly added as test recipients in the Meta console (up to 5) — submit the app for Meta's App Review to message arbitrary numbers in production.
5. Add `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` to `.env`.

Until this is set up, the site works fine — checkout still offers the WhatsApp option, but `src/lib/whatsapp.ts` logs a warning and the order confirmation is simply skipped rather than failing the purchase (the same is true if `RESEND_API_KEY` is missing).

## Deployment (Vercel)

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Add `DATABASE_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, and `RESEND_API_KEY` in the Vercel project settings (point `DATABASE_URL` at your production Postgres); add `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` too if you've done the [WhatsApp setup](#whatsapp-setup). `NEXT_PUBLIC_SITE_URL` doesn't need to be set on Vercel — it auto-detects the deployment's own domain (see [src/lib/site-config.ts](src/lib/site-config.ts)); only set it if you want to force a custom domain before it's attached.
3. Run `npm run db:migrate` (or `npx prisma migrate deploy`) against the production database once, then `npm run db:seed` to load your real event data.
4. Create a **live** PayPal app at [developer.paypal.com/dashboard/applications/live](https://developer.paypal.com/dashboard/applications/live), and set `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` to its live credentials and `PAYPAL_ENV=live` in Vercel when you're ready to take real payments. Until then, leaving it on `sandbox` is deliberate for a public demo link — it lets visitors run through a full checkout without real charges.

## Project structure

```
src/
  app/
    page.tsx                   Current event page
    past-events/page.tsx       Past events gallery
    checkout/success/page.tsx  Captures the PayPal order, shows confirmation
    api/checkout/route.ts      Creates the PayPal order
    icon.png, apple-icon.png   Favicon / touch icon, generated from the brand logo
  components/
    site-header.tsx            Sticky (lg:+) / scrolls-away (below lg:) header with hamburger nav
    event-hero.tsx             Title/date/location/cover image
    event-experience.tsx       Ticket list + buy panel; owns selection state and scroll-to-center
    buy-panel.tsx              Name/email/quantity form, talks to /api/checkout
    ticket-type-card.tsx       One ticket row
    past-event-section.tsx     One past event's block in the gallery
  lib/
    prisma.ts                  Prisma client singleton
    paypal.ts                  PayPal Orders v2 REST client (create/get/capture/refund), plain fetch
    fulfill-order.ts           Marks an order PAID + decrements inventory, or refunds on a lost race
    notify.ts                  Sends the order confirmation via whichever contact method was chosen
    resend.ts, whatsapp.ts     Email / WhatsApp send clients, plain fetch
    data.ts                    getActiveEvent / getPastEvents
    format.ts, site-config.ts  Formatting helpers, brand constants
prisma/
  schema.prisma                 Event / TicketType / GalleryItem / Order / OrderItem
  seed.ts                       Manual event data (no admin panel yet)
scripts/
  generate-placeholder-art.mjs  Regenerates the placeholder cover/gallery art
  test-oversell-race.ts         Verifies the last-ticket race condition against a real database
```

## Planned features

- **Admin panel** — create/edit events, ticket types, and gallery uploads without touching `seed.ts` directly; view and manage orders
- **Scannable digital tickets** — the buyer now gets an order confirmation by email or WhatsApp (see [src/lib/notify.ts](src/lib/notify.ts)), but not yet an individual scannable admission ticket. Needs a `Ticket` model (one row per admitted person, not per order, each with a unique code + `checkedInAt`), a QR code per ticket, and eventually a door check-in scanner view
- **Business-side order notifications** — the business itself doesn't currently get notified of new sales beyond checking the database/a future admin panel
- **PayPal webhook** — orders are currently captured synchronously when the buyer lands back on the success page; a `PAYMENT.CAPTURE.COMPLETED` webhook would make fulfillment resilient to the buyer closing their browser mid-redirect
- Customer/business-initiated refunds or order cancellation (there's already an automatic refund if a race for the last ticket is lost — see [src/lib/fulfill-order.ts](src/lib/fulfill-order.ts) — but nothing yet for "I want to cancel my order")
- Multiple simultaneous on-sale events (currently one "active" event at a time)

## License

See [LICENSE](LICENSE).
