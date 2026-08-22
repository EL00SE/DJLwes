import Link from "next/link";
import { requireAdmin } from "@/app/admin/actions";
import { ScanClient } from "@/app/admin/scan/scan-client";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-md px-5 py-10">
      <Link href="/admin" className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint hover:text-ink">
        ← Admin
      </Link>
      <h1 className="mt-4 font-display text-3xl tracking-wide text-ink">Scan Tickets</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Point the camera at a buyer&apos;s QR to check them in at the door.
      </p>
      <ScanClient />
    </div>
  );
}
