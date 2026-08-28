import { Spinner } from "@/components/spinner";

/** Shown automatically by Next.js while a route segment's data is
 * loading — see the loading.tsx files alongside pages that fetch on the
 * server (homepage, past events, admin). */
export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-24 text-accent-bright">
      <Spinner size={32} />
    </div>
  );
}
