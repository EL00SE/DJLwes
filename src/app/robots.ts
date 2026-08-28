import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

// Keeps /admin (and its API routes) out of search results — there's
// nothing there a search engine should ever index, and no reason to
// advertise the login page's existence to crawlers.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"],
    },
    sitemap: `${siteConfig.siteUrl}/sitemap.xml`,
  };
}
