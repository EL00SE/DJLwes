import Image from "next/image";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { CountdownTimer } from "@/components/countdown-timer";
import { FitText } from "@/components/fit-text";

export function EventHero({
  title,
  description,
  date,
  location,
  coverImage,
  coverImageFocalPoint,
}: {
  title: string;
  description: string;
  date: Date;
  location: string;
  coverImage: string;
  coverImageFocalPoint: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="glow-field" />
      <div className="dot-grid absolute inset-0 z-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
            {siteConfig.djName} presents
          </p>
          <h1 className="mt-3">
            <FitText className="text-glow font-display text-6xl leading-[0.95] tracking-wide text-ink sm:text-7xl lg:text-8xl">
              {title}
            </FitText>
          </h1>
          <p className="mt-5 max-w-prose text-base leading-relaxed text-ink-muted sm:text-lg">
            {description}
          </p>

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
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
              <dd className="mt-1 text-sm font-medium text-ink">{location}</dd>
            </div>
          </dl>

          <div className="mt-8">
            <CountdownTimer date={date} />
          </div>
        </div>

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-line-strong shadow-[0_0_60px_-15px_rgba(177,59,255,0.45)] sm:aspect-[5/4] lg:aspect-[4/5]">
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
      </div>
    </section>
  );
}
