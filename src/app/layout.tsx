import type { Metadata } from "next";
import { Bebas_Neue, Inter, Space_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig } from "@/lib/site-config";
import { buildSocialMetadata } from "@/lib/metadata";
import "./globals.css";

const displayFont = Bebas_Neue({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const sansFont = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const monoFont = Space_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

// A site-wide fallback — pages like /past-events inherit this as-is,
// while the homepage overrides it per-event via its own generateMetadata
// (see src/app/page.tsx) so a shared link shows that event's own photo.
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  ...buildSocialMetadata({
    title: `${siteConfig.eventSeriesName} — ${siteConfig.djName}`,
    description: siteConfig.tagline,
    image: "/images/event-cover-boiler.svg",
  }),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink antialiased">
        {/* Visually hidden until focused — lets a keyboard user jump past
            the header/nav straight to the page content instead of tabbing
            through every nav link first. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-5 focus:z-50 focus:rounded-full focus:bg-accent focus:px-5 focus:py-2.5 focus:font-mono focus:text-xs focus:uppercase focus:tracking-[0.2em] focus:text-white"
        >
          Skip to content
        </a>
        <div className="grain-overlay" />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <SiteHeader />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
