# Etfe El Boiler — DJ Lwes Ticketing

A customer-facing event ticketing site for **DJ Lwes**' *Etfe El Boiler* parties: a live event page with real-time ticket availability, a past-events gallery, and a PayPal-powered checkout flow.

Dark, underground deep-house visual identity — neon violet glow, film grain, ticket-stub details — built to feel like a real party's site rather than a template.

**Live demo:** [dj-lwes-paypal-showcase.vercel.app](https://dj-lwes-paypal-showcase.vercel.app)

> **This is a portfolio/CV snapshot branch.** The client's actual live site (`main`) now hands checkout off to an external [Grow](https://grow.business)-hosted payment page instead — a decision made partway through the project. This branch is a frozen copy of the original, fuller in-app implementation (PayPal checkout, signature-verified webhooks, race-safe inventory, admin approval), kept alive with its own isolated database purely to demonstrate that work. See `main`'s README for the current production setup and why the two diverged.

## Screenshots

_Run `npm run dev`, visit `http://localhost:3000`, and drop screenshots into a `docs/screenshots` folder (real event content is already seeded, so these can be the real thing rather than placeholders):_

- Current event page (hero, tickets, buy panel)
- Buy panel open on mobile — centered in the viewport, header scrolled out of the way
- The hamburger nav open on a small screen
- Past events gallery
- Checkout confirmation
- Admin event editor (photo upload, ticket tiers)

## Features

- **Current event page** — title, description, date/time, location, cover image, and live ticket types with remaining quantity
- **Past events gallery** — grid of photos/video per past event
- **Buy flow** — clicking "Buy" opens a ticket panel: side-by-side on desktop, or on mobile the page smooth-scrolls to center the form in the viewport (the header un-stickies below `lg:` specifically so this centers against the *true* visible viewport, not one a floating header is eating into)
- **Checkout** — PayPal Checkout (sandbox/test mode) or a manual bank transfer, plus a required Instagram handle so the business owner can vet who's buying before approving an order
- **Bank transfer as a second payment method** — a buyer who picks it sees the account details + a short reference to include, instead of being sent to PayPal; the order sits PENDING (no PayPal capture exists to trigger this automatically) until the business owner checks their real bank statement and clicks **Mark as Received** in [`/admin`](#admin-panel) — that reserves inventory and moves it into the exact same approve/decline pipeline as a PayPal order from there. Declining still releases the ticket back into inventory even though there's no refund API to call — the owner just has to actually wire the money back themselves. See [src/lib/fulfill-order.ts](src/lib/fulfill-order.ts)'s `confirmBankTransferPayment` and [src/lib/bank-details.ts](src/lib/bank-details.ts) (placeholder account details — swap in the real ones before this ever takes a real order)
- **Manual approval before tickets go out** — payment is captured immediately, but the buyer's ticket confirmation isn't sent until the business owner approves the order in [`/admin`](#admin-panel). Declining automatically refunds the payment and releases the ticket back into inventory — see [src/app/admin/actions.ts](src/app/admin/actions.ts)
- **Confirmation** — once approved, a real confirmation is sent to the buyer's choice of email (via [Resend](https://resend.com)) or WhatsApp (via [Meta's WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)) — see [src/lib/notify.ts](src/lib/notify.ts). This is an order confirmation, not yet a scannable admission ticket — see [Planned features](#planned-features)
- **Inventory safety** — ticket quantities are decremented atomically on payment, so two buyers can never both win the same last ticket. If a buyer loses that race *after* paying, they're automatically refunded in full rather than left charged with nothing — see [src/lib/fulfill-order.ts](src/lib/fulfill-order.ts) and the verification script at [scripts/test-oversell-race.ts](scripts/test-oversell-race.ts), which simulates two concurrent buyers racing for the last ticket against a real database
- **Signature-verified PayPal webhook** — payment is captured immediately on the success page as a fast path, but the webhook (verified against PayPal's own API — see [PayPal webhook setup](#paypal-webhook-setup)) is the actual source of truth: it fulfills orders even if the buyer's browser never makes it back to the site, and syncs a refund issued directly from the PayPal dashboard (or a dispute/chargeback) back into this app — releasing the ticket and marking the order REFUNDED without anyone touching `/admin`. See [src/app/api/webhooks/paypal/route.ts](src/app/api/webhooks/paypal/route.ts)
- **Admin approve/decline is race-safe** — a single atomic conditional update ([src/lib/orders.ts](src/lib/orders.ts)'s `claimOrderStatus`) means a double-click, two open admin tabs, or the webhook and an admin action landing at the same moment can never both "win" the same order
- **Admin event editor** ([`/admin/events`](#admin-panel)) — list, create, and edit events (title, description, Israel-local date/time, location, cover photo uploaded to [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) straight from the browser, and a "make this the live event" toggle that atomically demotes whichever one was active) — see [src/lib/events.ts](src/lib/events.ts)
- **Ticket-tier management** — add, edit, or delete a ticket tier (name, description, price, quantity) right from the event editor. Editing preserves however many are already sold (raising a 20/20 tier that's sold 5 to a total of 30 leaves 25 remaining, not 30), and both the total and delete are guarded against breaking real orders — see [src/app/api/admin/ticket-types/[id]/route.ts](<src/app/api/admin/ticket-types/[id]/route.ts>)
- **Responsive down to 320px** — hamburger nav below `sm:`, 44px touch targets on buy controls, no horizontal overflow anywhere in the range, audited from a 320px phone up through 2560px ultra-wide

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript, Turbopack)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [PayPal Checkout](https://developer.paypal.com/docs/checkout/) (Orders v2 REST API, sandbox/test mode)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for admin-uploaded event cover images
- [Resend](https://resend.com/) for order-confirmation email, [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api) for WhatsApp delivery
- [Zod](https://zod.dev/) for request validation
- Deployed on [Vercel](https://vercel.com/)

## Data model

`Event` → has many `TicketType` and `GalleryItem`. `Order` → belongs to an `Event`, has many `OrderItem` (each pointing at a `TicketType`). See [prisma/schema.prisma](prisma/schema.prisma).

Events, ticket tiers, and order approvals all have an admin UI (see [Admin panel](#admin-panel) below) — `prisma/seed.ts` is only needed for the initial demo data, not ongoing changes.

## Setup

### Prerequisites

- Node.js 20+
- A PostgreSQL database — either run one locally with Docker, or use a free hosted instance (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/storage/postgres))
- A [PayPal Developer](https://developer.paypal.com/dashboard/) account (free — used to create a sandbox app for test-mode payments; no real charges)
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store — for admin-uploaded event cover images (see [Vercel Blob setup](#vercel-blob-setup) below)
- A [Resend](https://resend.com/) account (free tier, no card required) for sending order-confirmation emails
- Optional, for WhatsApp delivery: a [Meta for Developers](https://developers.facebook.com/) app with the WhatsApp product added — see [WhatsApp setup](#whatsapp-setup) below. Skip this and the site still works fine with email-only delivery.
- A password of your choosing for the [admin panel](#admin-panel) (`ADMIN_PASSWORD`) — no account/signup, just pick one

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
| `PAYPAL_WEBHOOK_ID` | See [PayPal webhook setup](#paypal-webhook-setup) below — the webhook won't function without it |
| `BLOB_READ_WRITE_TOKEN` | See [Vercel Blob setup](#vercel-blob-setup) below — cover-image upload won't work without it |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local dev |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | See [WhatsApp setup](#whatsapp-setup) below — optional, only needed if you want WhatsApp delivery working |
| `ADMIN_PASSWORD` | Pick anything — this is the only thing gating `/admin` |

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

`db:seed` creates one active event (shown on the homepage) and two past events (shown under "Past Events") with placeholder art. Edit `prisma/seed.ts` to change the initial data, or use [`/admin/events`](#admin-panel) for everything afterward.

### 4. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Clicking "Continue to Payment" redirects to a real PayPal checkout page (sandbox mode, so no real money moves) — log in with a [sandbox test buyer account](https://developer.paypal.com/dashboard/accounts) (created automatically alongside your app) to complete a test purchase.

### Vercel Blob setup

1. In your [Vercel dashboard](https://vercel.com/dashboard), open (or create) the project, go to **Storage → Create Database → Blob**, and give it a name.
2. Connect it to this project — Vercel auto-injects a `BLOB_READ_WRITE_TOKEN` into the connected project's Production/Preview environment variables automatically, via OIDC — no manual copying needed for deployments on Vercel itself.
3. For **local dev**, that OIDC handshake doesn't apply (your laptop isn't a Vercel deployment) — open the store's page, use its "`.env.local`" quickstart tab to get a `BLOB_READ_WRITE_TOKEN` value, and paste it into your local `.env`.

### PayPal webhook setup

The webhook is what makes fulfillment reliable even when a buyer never makes it back to `/checkout/success` (closed tab, crash, lost connection) — see [Features](#features) above. It needs a public URL, so this only really works once deployed (a local `http://localhost:3000` can't receive webhook deliveries from PayPal).

1. In the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/), open your app (the same sandbox or live app you got `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` from), scroll to **Webhooks**, and click **Add Webhook**.
2. Set the URL to `https://<your-domain>/api/webhooks/paypal`.
3. Subscribe to these events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`.
4. Save, then copy the **Webhook ID** it generates into `PAYPAL_WEBHOOK_ID`.
5. Sandbox and live apps each need their own webhook registered separately (same as their API credentials).

Without `PAYPAL_WEBHOOK_ID` set, the endpoint refuses every request (503) rather than silently doing nothing.

**A caveat worth knowing:** PayPal's *sandbox* signature-verification API is known to be more lenient than production — it can return a valid signature for a request that isn't genuinely from PayPal, which makes the "reject a forged webhook" path hard to fully prove out in sandbox specifically (the "reject if headers are missing" and "reject if misconfigured" paths test cleanly either way). This isn't something this codebase can work around — it's PayPal's own sandbox behavior — so treat sandbox webhook testing as proving the *fulfillment logic* works, and trust PayPal's documented signature verification for the actual security guarantee once you're on a live app.

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

## Admin panel

Visit `/admin` and log in with `ADMIN_PASSWORD` (session lasts 7 days, single shared password — there's no per-person accounts, and it's not meant for a team of staff logging in independently). You'll see:

- **Events** — a card linking to [`/admin/events`](#admin-panel): list every event, create a new one, or edit an existing one's content and ticket tiers. Editing an event also surfaces its **Ticket tiers**: add/edit/delete a tier, with editing preserving already-sold quantities and deletion blocked if any real order references the tier.
- **Awaiting your approval** — every `PAID` order, oldest first, with the buyer's name, Instagram handle (linked out), contact info, tickets, and total. **Approve** sends the confirmation email/WhatsApp immediately. **Decline & Refund** refunds the PayPal payment in full and puts the ticket(s) back into inventory for someone else to buy.
- **Recent history** — the last 20 approved/declined orders, for reference. A confirmed order whose notification failed to send (e.g. `RESEND_API_KEY` wasn't set yet) shows a **Resend** button.
- **Experimental: Grow guest requests** (collapsed) — a separate free-request-then-approve flow built for an earlier Grow-integration attempt, unused on this branch (the live checkout above is PayPal) but kept functional.

There's intentionally no "cancel/undo" on an order approval — the confirmation goes out the moment you click Approve.

## Deployment (Vercel)

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new), pointing its **Production Branch** at `paypal-showcase` if you want this specific implementation live (rather than `main`'s Grow-link flow).
2. Set up a [Vercel Blob store](#vercel-blob-setup) and connect it to the project.
3. Add `DATABASE_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `RESEND_API_KEY`, and `ADMIN_PASSWORD` (pick a real one — this is a real password on a live site now) in the Vercel project settings (point `DATABASE_URL` at your production Postgres); add `WHATSAPP_ACCESS_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` too if you've done the [WhatsApp setup](#whatsapp-setup). `NEXT_PUBLIC_SITE_URL` doesn't need to be set on Vercel — it auto-detects the deployment's own domain (see [src/lib/site-config.ts](src/lib/site-config.ts)); only set it if you want to force a custom domain before it's attached.
4. Run `npm run db:migrate` (or `npx prisma migrate deploy`) against the production database once, then `npm run db:seed` to load your real event data.
5. Once you have a real domain, do the [PayPal webhook setup](#paypal-webhook-setup) — it needs a live URL, so this is the one piece that can't be done before the first deploy — and add `PAYPAL_WEBHOOK_ID` to Vercel.
6. Create a **live** PayPal app at [developer.paypal.com/dashboard/applications/live](https://developer.paypal.com/dashboard/applications/live), and set `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` to its live credentials, `PAYPAL_ENV=live`, and a fresh live-app `PAYPAL_WEBHOOK_ID` in Vercel when you're ready to take real payments. Until then, leaving it on `sandbox` is deliberate for a public demo link — it lets visitors run through a full checkout without real charges.

## Project structure

```
src/
  app/
    page.tsx                        Current event page
    past-events/page.tsx            Past events gallery
    checkout/success/page.tsx       Captures the PayPal order, shows payment-received/confirmed state
    api/checkout/route.ts           Creates the PayPal order
    api/webhooks/paypal/route.ts    Signature-verified webhook: authoritative fulfillment + refund sync
    api/upload/route.ts             Issues Vercel Blob client-upload tokens (admin-gated)
    api/admin/events/route.ts       Create event
    api/admin/events/[id]/route.ts  Update event
    api/admin/events/[id]/ticket-types/route.ts  Add a ticket tier
    api/admin/ticket-types/[id]/route.ts         Edit/delete a ticket tier
    admin/page.tsx                  Password-gated: approve/decline PAID orders + Manage Events card
    admin/events/page.tsx           List every event
    admin/events/new/page.tsx       Create form
    admin/events/[id]/edit/page.tsx Edit form + ticket-tier manager
    admin/login/page.tsx            Admin login form
    admin/actions.ts                Server actions: login/logout, confirm/decline/resend
    icon.png, apple-icon.png        Favicon / touch icon, generated from the brand logo
  components/
    site-header.tsx                 Sticky (lg:+) / scrolls-away (below lg:) header with hamburger nav
    event-hero.tsx                  Title/date/location/cover image
    event-experience.tsx            Ticket list + buy panel; owns selection state and scroll-to-center
    buy-panel.tsx                   Name/email/quantity form, talks to /api/checkout
    ticket-type-card.tsx            One ticket row
    past-event-section.tsx          One past event's block in the gallery
    admin/event-form.tsx            Create/edit event form, incl. Blob upload
    admin/ticket-types-manager.tsx  Add/edit/delete ticket tiers
  lib/
    prisma.ts                       Prisma client singleton
    paypal.ts                       PayPal Orders v2 REST client (create/get/capture/refund), plain fetch
    fulfill-order.ts                Marks an order PAID + decrements inventory, or refunds on a lost race
    notify.ts                       Sends the order confirmation via whichever contact method was chosen
    resend.ts, whatsapp.ts          Email / WhatsApp send clients, plain fetch
    admin-auth.ts                   Password check + signed session-cookie helpers for /admin
    orders.ts                       Shared order include/type, terminal-status list, atomic status-claim helper
    events.ts                       Slug generation, atomic "set active event", event zod schema
    ticket-types.ts                 Ticket-tier zod schema, dollars-to-cents helper
    data.ts                         getActiveEvent / getPastEvents
    format.ts, site-config.ts       Formatting helpers, brand constants
prisma/
  schema.prisma                     Event / TicketType / GalleryItem / Order / OrderItem
  seed.ts                           Initial demo data — everything after that goes through /admin
scripts/
  generate-placeholder-art.mjs      Regenerates the placeholder cover/gallery art
  test-oversell-race.ts             Verifies the last-ticket race condition against a real database
```

## Planned features

- **Scannable digital tickets** — the buyer now gets an order confirmation by email or WhatsApp (see [src/lib/notify.ts](src/lib/notify.ts)), but not yet an individual scannable admission ticket. Needs a `Ticket` model (one row per admitted person, not per order, each with a unique code + `checkedInAt`), a QR code per ticket, and eventually a door check-in scanner view
- **New-order alerts** — the business owner currently has to check `/admin` to see what's awaiting approval; a notification (email/WhatsApp to the business itself) on every new order would close that loop
- Customer-initiated cancellation (refunds already happen automatically on a lost last-ticket race, and manually via [Decline in /admin](#admin-panel) — but there's no "I want to cancel my own order" path for the buyer)
- Multiple simultaneous on-sale events (currently one "active" event at a time)
- Gallery-item management in `/admin` (past-event photos/videos are still seed-only)

## License

See [LICENSE](LICENSE).
