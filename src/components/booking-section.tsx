import { siteConfig } from "@/lib/site-config";
import { bookingContact } from "@/lib/site-content";
import { ScrollReveal } from "@/components/scroll-reveal";

/** Private-booking contact links (weddings, private parties, corporate
 * events) — plain WhatsApp/email/Instagram links, not a form. Whichever
 * of bookingContact's three fields are set show up here; hides entirely
 * if none are. */
export function BookingSection() {
  const links = [
    bookingContact.whatsappNumber && {
      label: "WhatsApp",
      href: `https://wa.me/${bookingContact.whatsappNumber}`,
    },
    bookingContact.email && {
      label: "Email",
      href: `mailto:${bookingContact.email}`,
    },
    bookingContact.instagramHandle && {
      label: "Instagram",
      href: `https://instagram.com/${bookingContact.instagramHandle}`,
    },
  ].filter((link): link is { label: string; href: string } => Boolean(link));

  if (links.length === 0) return null;

  return (
    <ScrollReveal>
      <div id="booking" className="mx-auto max-w-3xl scroll-mt-24 px-5 py-16 text-center sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
          Book {siteConfig.djName}
        </p>
        <h2 className="mt-2 font-display text-4xl tracking-wide text-ink sm:text-5xl">
          Planning a private event?
        </h2>
        <p className="mx-auto mt-5 max-w-prose text-base leading-relaxed text-ink-muted">
          Weddings, private parties, corporate nights — {siteConfig.djName} plays those too. Reach
          out directly and let&apos;s talk details.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center rounded-full bg-accent px-6 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 active:opacity-80"
            >
              {link.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
