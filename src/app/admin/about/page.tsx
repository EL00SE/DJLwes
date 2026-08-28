import Link from "next/link";
import { requireAdmin } from "@/app/admin/actions";
import { getAboutContent } from "@/lib/about-content";
import { AboutContentForm } from "@/components/admin/about-content-form";

export const dynamic = "force-dynamic";

export default async function AdminAboutPage() {
  await requireAdmin();
  const content = await getAboutContent();

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <Link href="/admin" className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint hover:text-ink">
        ← Admin
      </Link>
      <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">Admin</p>
      <h1 className="mt-1 mb-2 font-display text-4xl tracking-wide text-ink">About Us</h1>
      <p className="mb-8 text-sm text-ink-muted">
        Controls the homepage&apos;s About section — the bio and photos shown alongside the current
        event, and on the &quot;no event on sale&quot; state.
      </p>
      <AboutContentForm initial={{ bio: content.bio, photos: content.photos }} />
    </div>
  );
}
