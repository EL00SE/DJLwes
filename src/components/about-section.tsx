import Image from "next/image";
import { aboutContent } from "@/lib/site-content";
import { siteConfig } from "@/lib/site-config";
import { ScrollReveal } from "@/components/scroll-reveal";

export function AboutSection() {
  return (
    <ScrollReveal>
      <div
        id="about"
        className="mx-auto grid max-w-6xl scroll-mt-24 gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-14"
      >
        <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl border border-line-strong shadow-[0_0_60px_-20px_rgba(177,59,255,0.5)]">
          <Image
            src={aboutContent.photo}
            alt={siteConfig.djName}
            fill
            sizes="(min-width: 1024px) 380px, 90vw"
            className="object-cover"
          />
        </div>

        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
            About {siteConfig.djName}
          </p>
          <h2 className="mt-2 font-display text-4xl tracking-wide text-ink sm:text-5xl">
            The night behind {siteConfig.eventSeriesName}
          </h2>
          <p className="mt-5 max-w-prose text-base leading-relaxed text-ink-muted">
            {aboutContent.bio}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {aboutContent.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line-strong px-5 py-2 font-mono text-xs uppercase tracking-[0.15em] text-ink-muted transition-colors hover:border-accent hover:text-accent-bright"
              >
                {social.label}
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
