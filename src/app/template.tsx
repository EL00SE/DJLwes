// Wraps every route (see globals.css's .page-transition). Next.js
// remounts template.tsx — unlike layout.tsx, which persists — on every
// navigation, so a plain CSS animation on mount is all a page-transition
// fade needs; no client-side JS or router event listeners required.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
