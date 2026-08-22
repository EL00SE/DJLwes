import type { Metadata } from "next";
import { Bebas_Neue, Inter, Space_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteConfig, resolveAbsoluteUrl } from "@/lib/site-config";
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
  title: `${siteConfig.eventSeriesName} — ${siteConfig.djName}`,
  description: siteConfig.tagline,
  metadataBase: new URL(siteConfig.siteUrl),
  openGraph: {
    title: `${siteConfig.eventSeriesName} — ${siteConfig.djName}`,
    description: siteConfig.tagline,
    images: [{ url: resolveAbsoluteUrl("/images/event-cover-boiler.svg") }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.eventSeriesName} — ${siteConfig.djName}`,
    description: siteConfig.tagline,
    images: [resolveAbsoluteUrl("/images/event-cover-boiler.svg")],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink antialiased">
        <div className="grain-overlay" />
        <div className="relative z-10 flex min-h-full flex-1 flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
