import { siteConfig } from "@/lib/site-config";
import { ScrollReveal } from "@/components/scroll-reveal";
import { BookingRequestForm } from "@/components/booking-request-form";

/** Private-booking inquiry form (weddings, private parties, corporate
 * events) — separate from the public ticketed nights above. Submits to
 * /api/booking-requests; requests show up in /admin for the business
 * owner to follow up on directly. */
export function BookingSection() {
  return (
    <ScrollReveal>
      <div id="booking" className="mx-auto max-w-3xl scroll-mt-24 px-5 py-16 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
          Book {siteConfig.djName}
        </p>
        <h2 className="mt-2 font-display text-4xl tracking-wide text-ink sm:text-5xl">
          Planning a private event?
        </h2>
        <p className="mt-5 max-w-prose text-base leading-relaxed text-ink-muted">
          Weddings, private parties, corporate nights — {siteConfig.djName} plays those too. Send
          over a few details and we&apos;ll get back to you.
        </p>

        <div className="mt-8">
          <BookingRequestForm />
        </div>
      </div>
    </ScrollReveal>
  );
}
