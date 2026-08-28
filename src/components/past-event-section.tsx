import Image from "next/image";
import { formatEventDate } from "@/lib/format";
import { FitText } from "@/components/fit-text";
import { AutoplayVideo } from "@/components/autoplay-video";

type GalleryItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  caption: string | null;
};

export function PastEventSection({
  title,
  date,
  location,
  coverImage,
  galleryItems,
}: {
  title: string;
  date: Date;
  location: string;
  coverImage: string;
  galleryItems: GalleryItem[];
}) {
  return (
    <section className="border-b border-line py-14">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2>
              <FitText className="font-display text-4xl tracking-wide text-ink sm:text-5xl">
                {title}
              </FitText>
            </h2>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
              {formatEventDate(date)} &middot; {location}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="group relative col-span-2 row-span-2 aspect-[4/5] overflow-hidden rounded-2xl border border-line">
            <Image
              src={coverImage}
              alt={title}
              fill
              sizes="(min-width: 1024px) 480px, 60vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>

          {galleryItems.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-line"
            >
              {item.type === "VIDEO" ? (
                <AutoplayVideo
                  src={item.url}
                  className="h-full w-full object-cover"
                  ariaLabel={item.caption ?? title}
                />
              ) : (
                <Image
                  src={item.url}
                  alt={item.caption ?? title}
                  fill
                  sizes="(min-width: 1024px) 240px, 40vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              {item.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/90 to-transparent p-2">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">
                    {item.caption}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
