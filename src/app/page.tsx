import type { Metadata } from "next";
import Link from "next/link";
import { getActiveEvent, getMostRecentPastEventWithGallery } from "@/lib/data";
import { getAboutContent } from "@/lib/about-content";
import { getInstagramFeed } from "@/lib/instagram-feed";
import { EventHero } from "@/components/event-hero";
// Both the instant-PayPal-purchase flow (EventExperience) and the
// free-request-then-approve flow (GuestRequestExperience) are kept in the
// repo, unused — ticket buying is now a single link out to a Shmor-Makom-hosted
// checkout page (Shmor Makom owns pricing/quantity/invoicing from here), set per
// event in /admin/events. See buy-tickets-section.tsx — its BuyTicketsButton
// is the one live copy of this, in EventHero (via StickyBuyButton); the
// standalone BuyTicketsSection further down the page was a second one and
// has been removed so there's only ever the single button.
import { LineupSection } from "@/components/lineup-section";
import { TicketTiersInfo } from "@/components/ticket-tiers-info";
import { HomepageGalleryTeaser } from "@/components/homepage-gallery-teaser";
import { AboutSection } from "@/components/about-section";
import { InstagramSection } from "@/components/instagram-section";
import { BookingSection } from "@/components/booking-section";
import { NotifySignupForm } from "@/components/notify-signup-form";
import { siteConfig } from "@/lib/site-config";
import { buildSocialMetadata } from "@/lib/metadata";

// Ticket availability must always be fresh — never statically cached.
export const dynamic = "force-dynamic";

// The homepage's Instagram section is hidden for now (the video posts need
// more work before they're ready to show). Everything behind it — the
// section, the live-API feed, the pasted-link fallback, the admin field
// for pasting links — is intact; flip this to true to bring it back.
const SHOW_INSTAGRAM_SECTION = false;

// Dynamic per the active event, so sharing the homepage link on
// WhatsApp/Instagram/Twitter shows that event's own photo/title/description
// as a rich preview instead of a generic blank card. Calls getActiveEvent()
// independently of the page component below — safe (not a duplicate query)
// because that function is wrapped in React's cache().
export async function generateMetadata(): Promise<Metadata> {
  const event = await getActiveEvent();

  return buildSocialMetadata({
    title: event ? `${event.title} — ${siteConfig.eventSeriesName}` : siteConfig.eventSeriesName,
    description: event?.description ?? siteConfig.tagline,
    image: event?.coverImage ?? "/images/event-cover-boiler.svg",
  });
}

export default async function HomePage() {
  // Independent queries — both always needed regardless of which branch
  // below ends up rendering, so there's no reason to wait on one before
  // starting the other.
  const [event, aboutContent] = await Promise.all([getActiveEvent(), getAboutContent()]);

  if (!event) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-5 py-32 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
          {siteConfig.djName}
        </p>
        <h1 className="font-display text-5xl tracking-wide text-ink">
          No event on sale right now
        </h1>
        <p className="text-ink-muted">
          Check back soon, or take a look at previous {siteConfig.eventSeriesName} nights.
        </p>
        <Link
          href="/past-events"
          className="mt-4 rounded-full border border-accent-dim px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-accent-bright transition-colors hover:bg-accent hover:text-white active:bg-accent active:text-white"
        >
          See Past Events
        </Link>

        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Want to know the second it&apos;s announced?
          </p>
          <NotifySignupForm />
        </div>

        <AboutSection bio={aboutContent.bio} photos={aboutContent.photos} />
        <BookingSection />
      </div>
    );
  }

  // Only fetched once there's actually an active event to render this
  // alongside — the no-event branch above returns before ever needing
  // either. Independent of each other, so run together. The Instagram
  // feed is skipped entirely while the section is hidden.
  const [pastEventWithGallery, instagramFeed] = await Promise.all([
    getMostRecentPastEventWithGallery(),
    SHOW_INSTAGRAM_SECTION ? getInstagramFeed() : null,
  ]);

  return (
    // `relative` + the empty host below: StickyBuyButton portals its
    // pinned Buy Tickets button in here, as a lane spanning the whole
    // page, so it can use native position:sticky — it can't live inside
    // the hero, whose clipping and short height would end the sticking.
    <div className="relative">
      <div id="buy-rail-host" />
      <EventHero
        title={event.title}
        description={event.description}
        date={event.date}
        location={event.location}
        coverImage={event.coverImage}
        coverImageFocalPoint={event.coverImageFocalPoint}
        buyLink={event.buyLink}
        disclaimer={event.buyDisclaimer}
        entryRequirements={event.entryRequirements}
      />
      {SHOW_INSTAGRAM_SECTION && (
        <InstagramSection feed={instagramFeed} fallbackPosts={aboutContent.instagramPosts} />
      )}
      <LineupSection lineup={event.lineup} />
      <TicketTiersInfo ticketTypes={event.ticketTypes} />
      {pastEventWithGallery && (
        <HomepageGalleryTeaser
          eventTitle={pastEventWithGallery.title}
          items={pastEventWithGallery.galleryItems}
        />
      )}
      <AboutSection bio={aboutContent.bio} photos={aboutContent.photos} />
      <BookingSection />
    </div>
  );
}
