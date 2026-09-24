import { cache } from "react";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeInstagramPostUrl } from "@/lib/instagram";

/** Fixed id for the one-and-only row — see the AboutContent doc comment
 * in schema.prisma for why this is a singleton rather than a real table. */
const ABOUT_CONTENT_ID = "about";

export const aboutContentFormSchema = z.object({
  bio: z.string().trim().min(1, "Bio is required").max(4000),
  photos: z.array(z.string().trim().min(1)).max(12, "That's a lot of photos — trim it down a bit"),
  instagramPosts: z
    .array(
      z.string().transform((raw, ctx) => {
        const url = normalizeInstagramPostUrl(raw);
        if (!url) {
          ctx.addIssue({
            code: "custom",
            message: `"${raw.trim()}" isn't an Instagram post or reel link (it should look like instagram.com/p/…)`,
          });
          return z.NEVER;
        }
        return url;
      })
    )
    .max(9, "Keep it to 9 posts or fewer")
    .default([]),
});

/** Wrapped in cache() the same way getActiveEvent() is — the homepage and
 * generateMetadata (if it ever needs this) shouldn't both pay for a
 * separate round trip within the same request. */
export const getAboutContent = cache(async function getAboutContent() {
  const content = await prisma.aboutContent.findUnique({ where: { id: ABOUT_CONTENT_ID } });
  // Should always exist (seeded on first migrate — see prisma/seed.ts) —
  // this fallback just means a fresh, not-yet-seeded database shows an
  // empty-but-not-broken About section instead of a 500.
  return (
    content ?? {
      id: ABOUT_CONTENT_ID,
      bio: "",
      photos: [] as string[],
      instagramPosts: [] as string[],
      updatedAt: new Date(),
    }
  );
});

export async function updateAboutContent(data: z.infer<typeof aboutContentFormSchema>) {
  return prisma.aboutContent.upsert({
    where: { id: ABOUT_CONTENT_ID },
    create: { id: ABOUT_CONTENT_ID, ...data },
    update: data,
  });
}
