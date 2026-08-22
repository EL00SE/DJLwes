"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";

export type TicketTypeRow = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  quantityTotal: number;
  quantityRemaining: number;
};

function TierEditForm({
  eventId,
  tier,
  onDone,
}: {
  eventId: string;
  tier: TicketTypeRow | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(tier?.name ?? "");
  const [description, setDescription] = useState(tier?.description ?? "");
  const [price, setPrice] = useState(tier ? (tier.priceCents / 100).toString() : "");
  const [quantityTotal, setQuantityTotal] = useState(tier ? String(tier.quantityTotal) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const body = {
        name,
        description,
        price: Number(price),
        quantityTotal: Number(quantityTotal),
      };
      const res = await fetch(
        tier ? `/api/admin/ticket-types/${tier.id}` : `/api/admin/events/${eventId}/ticket-types`,
        {
          method: tier ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-edge flex flex-col gap-3 rounded-2xl border border-accent-dim p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Name</span>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-line bg-bg/60 px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Description <span className="normal-case text-ink-faint">(optional)</span>
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-line bg-bg/60 px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Price (USD)
          </span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="rounded-lg border border-line bg-bg/60 px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Total quantity
          </span>
          <input
            required
            type="number"
            min="1"
            step="1"
            value={quantityTotal}
            onChange={(e) => setQuantityTotal(e.target.value)}
            className="rounded-lg border border-line bg-bg/60 px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
      </div>

      {tier && tier.quantityTotal !== tier.quantityRemaining && (
        <p className="text-xs text-ink-faint">
          {tier.quantityTotal - tier.quantityRemaining} already sold — the total can&apos;t drop
          below that.
        </p>
      )}

      {error && <p className="text-sm text-magenta">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-full bg-accent px-4 py-1.5 font-mono text-xs uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : tier ? "Save" : "Add tier"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-line-strong px-4 py-1.5 font-mono text-xs uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function TicketTypesManager({
  eventId,
  initial,
}: {
  eventId: string;
  initial: TicketTypeRow[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(tierId: string) {
    setDeleteError(null);
    setDeletingId(tierId);
    try {
      const res = await fetch(`/api/admin/ticket-types/${tierId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't delete this tier.");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Couldn't delete this tier.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {initial.length === 0 && !isAdding && (
        <p className="text-sm text-ink-muted">No ticket tiers yet — add one below.</p>
      )}

      {initial.map((tier) =>
        editingId === tier.id ? (
          <TierEditForm key={tier.id} eventId={eventId} tier={tier} onDone={() => setEditingId(null)} />
        ) : (
          <div
            key={tier.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm"
          >
            <div>
              <span className="text-ink">{tier.name}</span>{" "}
              <span className="text-ink-muted">{formatPrice(tier.priceCents)}</span>{" "}
              <span className="text-ink-faint">
                — {tier.quantityRemaining}/{tier.quantityTotal} remaining
              </span>
              {tier.description && <p className="mt-0.5 text-xs text-ink-faint">{tier.description}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingId(tier.id)}
                className="rounded-full border border-line-strong px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-muted hover:text-ink"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(tier.id)}
                disabled={deletingId === tier.id}
                className="rounded-full border border-line-strong px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-muted transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
              >
                {deletingId === tier.id ? "…" : "Delete"}
              </button>
            </div>
          </div>
        )
      )}

      {deleteError && <p className="text-sm text-magenta">{deleteError}</p>}

      {isAdding ? (
        <TierEditForm eventId={eventId} tier={null} onDone={() => setIsAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="self-start rounded-full border border-line-strong px-4 py-1.5 font-mono text-xs uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
        >
          + Add tier
        </button>
      )}
    </div>
  );
}
