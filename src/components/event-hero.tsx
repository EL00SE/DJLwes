import Image from "next/image";
import { formatEventDate, formatEventTime, parseLines } from "@/lib/format";
import { googleMapsUrl, wazeUrl } from "@/lib/maps";
import { CountdownTimer } from "@/components/countdown-timer";
import { FitText } from "@/components/fit-text";
import { StickyBuyButton } from "@/components/sticky-buy-button";

export function EventHero({
  title,
  description,
  date,
  location,
  coverImage,
  coverImageFocalPoint,
  buyLink,
  disclaimer,
  entryRequirements,
}: {
  title: string;
  description: string;
  date: Date;
  location: string;
  coverImage: string;
  coverImageFocalPoint: string;
  buyLink: string | null;
  disclaimer: string | null;
  entryRequirements: string | null;
}) {
  const rules = parseLines(entryRequirements);
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="glow-field" />
      <div className="dot-grid absolute inset-0 z-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      {/* Five separate grid items (not one text column + the image) so
          mobile and lg: can each order them independently via `order` —
          mobile wants title, photo, buy button, description, details;
          lg: keeps the original title, description, buy, details reading
          order in column 1 with the photo beside it in column 2. The
          photo's explicit lg:col-start-2/row-span-4 is what lets plain
          CSS Grid auto-placement route the other four, unpositioned,
          straight into column 1 without each needing its own
          lg:col-start-1. */}
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="order-1 min-w-0">
          {/* Deliberately hardcoded, not siteConfig.djName ("DJ Lwes") —
              same "Etfe Al Boiler" spelling requested for the header
              wordmark, used here as its own thing rather than derived
              from site-config.ts. */}
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
            Etfe Al Boiler presents
          </p>
          <h1 className="mt-3">
            <FitText className="text-glow font-display text-6xl leading-[0.95] tracking-wide text-ink sm:text-7xl lg:text-8xl">
              {title}
            </FitText>
          </h1>
        </div>

        <div className="relative order-2 aspect-[4/5] w-full overflow-hidden rounded-3xl border border-line-strong shadow-[0_0_60px_-15px_rgba(177,59,255,0.45)] sm:aspect-[5/4] lg:col-start-2 lg:row-start-1 lg:row-span-4 lg:aspect-[4/5]">
          <Image
            src={coverImage}
            alt={title}
            fill
            priority
            sizes="(min-width: 1024px) 480px, 100vw"
            className="object-cover"
            style={{ objectPosition: coverImageFocalPoint }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent" />
        </div>

        <StickyBuyButton buyLink={buyLink} disclaimer={disclaimer} className="order-3 min-w-0" />

        {/* whitespace-pre-line — the admin's own line breaks (Shift+Enter
            in the /admin/events description field) are real \n
            characters in the stored text; a plain <p> collapses them
            into one line, running everything together regardless of
            how it was actually entered. */}
        <p className="order-4 min-w-0 max-w-prose whitespace-pre-line text-base leading-relaxed text-ink-muted lg:order-2 sm:text-lg">
          {description}
        </p>

        <div className="order-5 min-w-0 lg:order-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="card-edge rounded-2xl px-5 py-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                Date &amp; Time
              </dt>
              <dd className="mt-1 text-sm font-medium text-ink">
                {formatEventDate(date)}
                <br />
                <span className="text-ink-muted">{formatEventTime(date)}</span>
              </dd>
            </div>
            <div className="card-edge rounded-2xl px-5 py-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                Location
              </dt>
              {/* The place itself is the link (Google Maps); Waze sits
                  beside it for those who navigate with that instead. Both
                  just search the typed location text — see lib/maps.ts. */}
              <dd className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                <a
                  href={googleMapsUrl(location)}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-start gap-1.5 py-1 text-sm font-medium text-ink transition-colors hover:text-accent-bright active:text-accent-bright"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="underline decoration-line-strong underline-offset-4 transition-colors group-hover:decoration-accent-bright">
                    {location}
                  </span>
                  <span className="sr-only"> — open in Google Maps (opens in a new tab)</span>
                </a>
                <a
                  href={wazeUrl(location)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-line-strong px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-accent-bright transition-colors hover:bg-accent hover:text-white active:bg-accent active:text-white"
                >
                  Waze
                  <span className="sr-only"> — open in Waze (opens in a new tab)</span>
                </a>
              </dd>
            </div>
          </dl>

          {rules.length > 0 && (
            <div className="card-edge mt-4 rounded-2xl border border-line-strong px-5 py-4">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-bright">
                Entry requirements
              </p>
              <ul className="flex flex-col gap-1.5">
                {rules.map((rule) => (
                  <li key={rule} className="flex items-start gap-2 text-sm text-ink-muted">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-bright" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <CountdownTimer date={date} />
          </div>
        </div>
      </div>
    </section>
  );
}
