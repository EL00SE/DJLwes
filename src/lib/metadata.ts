import type { Metadata } from "next";
import { resolveAbsoluteUrl } from "@/lib/site-config";

/** The Open Graph/Twitter card shape every page on the site shares —
 * built once here instead of hand-written at each call site (the
 * site-wide fallback in layout.tsx, and the homepage's per-event
 * override in page.tsx), so the two can't drift out of sync. */
export function buildSocialMetadata({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image: string;
}): Metadata {
  const absoluteImage = resolveAbsoluteUrl(image);
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: absoluteImage }] },
    twitter: { card: "summary_large_image", title, description, images: [absoluteImage] },
  };
}
