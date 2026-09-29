import Image from "next/image";
import { aboutContent } from "@/lib/site-content";
import { siteConfig } from "@/lib/site-config";
import { ScrollReveal } from "@/components/scroll-reveal";

/** Bio + photos come from the database now (admin-editable at
 * /admin/about — see src/lib/about-content.ts); socials and the
 * SoundCloud embed stay in site-content.ts for now, since they change
 * far less often. */
export function AboutSection({ bio, photos }: { bio: string; photos: string[] }) {
  return (
    <ScrollReveal>
      <div
        className={`mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 ${
          photos.length > 0 ? "lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14" : ""
        }`}
      >
        {photos.length === 1 ? (
          // aspect-square, not the taller aspect-[4/5] this used to be —
          // the one photo actually in use right now is the site's own
          // (square, 800x800) logo, and a portrait crop was cutting into
          // it top and bottom. Square is also just the safer default for
          // "one photo, could be anything" — a portrait crop is a much
          // more specific bet on what gets uploaded here.
          <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl border border-line-strong shadow-[0_0_60px_-20px_rgba(177,59,255,0.5)]">
            <Image
              src={photos[0]}
              alt={siteConfig.djName}
              fill
              sizes="(min-width: 1024px) 380px, 90vw"
              className="object-cover"
            />
          </div>
        ) : (
          photos.length > 1 && (
            <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-3">
              {photos.slice(0, 4).map((photo, i) => (
                <div
                  key={photo}
                  className="relative aspect-square overflow-hidden rounded-2xl border border-line-strong shadow-[0_0_40px_-16px_rgba(177,59,255,0.5)]"
                >
                  <Image
                    src={photo}
                    alt={`${siteConfig.djName} ${i + 1}`}
                    fill
                    sizes="(min-width: 1024px) 190px, 45vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )
        )}

        {/* The anchor target, deliberately not the outer grid above —
            that starts with the (on mobile, viewport-filling) photo, so
            landing there via the nav left the actual heading and bio
            pushed mostly or entirely below the fold. Anchoring to the
            text column itself means arriving here shows the content
            that matters, with the photo (still fully visible on desktop,
            where it's a side-by-side column) treated as the visual
            backdrop it's meant to be rather than the thing you scroll to. */}
        <div
          id="about"
          className={`scroll-mt-[18vh] ${photos.length === 0 ? "mx-auto max-w-2xl text-center" : ""}`}
        >
          {/* Deliberately hardcoded, not siteConfig.djName ("DJ Lwes") —
              same "Etfe Al Boiler" spelling used in the header wordmark
              and hero, used here as its own thing too. */}
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
            About Etfe Al Boiler
          </p>
          <h2 className="mt-2 font-display text-4xl tracking-wide text-ink sm:text-5xl">
            The night behind {siteConfig.eventSeriesName}
          </h2>
          {/* whitespace-pre-line — the admin's own line breaks (Shift+Enter
              in the /admin/about textarea) are real \n characters in the
              stored text; a plain <p> collapses them into one line, same
              class of bug as the event description (see event-hero.tsx). */}
          <p
            className={`mt-5 whitespace-pre-line text-base leading-relaxed text-ink-muted ${
              photos.length === 0 ? "mx-auto max-w-prose" : "max-w-prose"
            }`}
          >
            {bio}
          </p>

          <div className={`mt-6 flex flex-wrap gap-3 ${photos.length === 0 ? "justify-center" : ""}`}>
            {aboutContent.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 items-center rounded-full border border-line-strong px-5 py-2 font-mono text-xs uppercase tracking-[0.15em] text-ink-muted transition-colors hover:border-accent hover:text-accent-bright active:border-accent active:text-accent-bright"
              >
                {social.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </div>

          {aboutContent.soundcloudEmbedUrl && (
            <div className="mt-8 overflow-hidden rounded-2xl border border-line">
              <iframe
                title={`${siteConfig.djName} on SoundCloud`}
                width="100%"
                height="166"
                allow="autoplay"
                src={aboutContent.soundcloudEmbedUrl}
              />
            </div>
          )}
        </div>
      </div>
    </ScrollReveal>
  );
}
