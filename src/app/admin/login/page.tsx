import { loginAdminAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-6 px-5 py-32">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">Admin</p>
      <h1 className="font-display text-4xl tracking-wide text-ink">Sign in</h1>

      <form action={loginAdminAction} className="flex w-full flex-col gap-4">
        <input
          required
          autoFocus
          type="password"
          name="password"
          placeholder="Password"
          className="rounded-xl border border-line bg-bg-raised px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
        />
        {error && <p className="text-sm text-magenta">Incorrect password.</p>}
        <button
          type="submit"
          className="rounded-full bg-accent px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-white shadow-[0_0_30px_-6px_var(--color-accent)] transition-opacity hover:opacity-90"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
