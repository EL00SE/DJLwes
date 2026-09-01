import { HashScrollFix } from "@/components/hash-scroll-fix";

// Wraps every route (see globals.css's .page-transition). Next.js
// remounts template.tsx — unlike layout.tsx, which persists — on every
// navigation, so a plain CSS animation on mount is all a page-transition
// fade needs; no client-side JS or router event listeners required. Also
// hosts HashScrollFix for the same reason: it needs to re-run per
// navigation, not just once on first load.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition">
      <HashScrollFix />
      {children}
    </div>
  );
}
