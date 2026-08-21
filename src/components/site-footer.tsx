import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em]">
          &copy; {new Date().getFullYear()} {siteConfig.djName} &middot;{" "}
          {siteConfig.eventSeriesName}
        </p>
        <p className="font-mono text-xs uppercase tracking-[0.2em]">
          Tickets processed securely via PayPal
        </p>
      </div>
    </footer>
  );
}
