"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Spinner } from "@/components/spinner";

export type GalleryItemRow = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  caption: string | null;
};

function CaptionEditForm({
  item,
  onDone,
}: {
  item: GalleryItemRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(item.caption ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/gallery-items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: item.type, url: item.url, caption }),
      });
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
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          autoFocus
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          className="min-w-0 flex-1 rounded-lg border border-line bg-bg/60 px-3 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-white transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
        >
          {isSaving && <Spinner size={10} />}
          Save
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-line-strong px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-magenta">
          {error}
        </p>
      )}
    </form>
  );
}

export function GalleryItemsManager({ eventId, initial }: { eventId: string; initial: GalleryItemRow[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingCaption, setPendingCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ allowVideo: true }),
      });
      const res = await fetch(`/api/admin/events/${eventId}/gallery-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: isVideo ? "VIDEO" : "IMAGE",
          url: blob.url,
          caption: pendingCaption,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setPendingCaption("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/gallery-items/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't delete this item.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/gallery-items/${id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't reorder.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reorder.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {initial.length === 0 && (
        <p className="text-sm text-ink-muted">No gallery photos/videos yet — add some below.</p>
      )}

      {initial.map((item, i) => (
        <div key={item.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-bg-raised">
            {item.type === "VIDEO" ? (
              <video src={item.url} className="h-full w-full object-cover" muted playsInline />
            ) : (
              <Image src={item.url} alt="" fill className="object-cover" unoptimized />
            )}
          </div>

          {editingId === item.id ? (
            <CaptionEditForm item={item} onDone={() => setEditingId(null)} />
          ) : (
            <button
              type="button"
              onClick={() => setEditingId(item.id)}
              // min-w-0 keeps a long caption from pushing this row wider
              // than the screen instead of shrinking (flex items default
              // to min-width:auto, i.e. never smaller than their content)
              // — the classic cause of a phantom horizontal scrollbar.
              className="min-w-0 flex-1 truncate text-left text-sm text-ink-muted transition-colors hover:text-ink active:text-ink"
            >
              {item.caption || <span className="italic text-ink-faint">No caption — click to add</span>}
            </button>
          )}

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => handleReorder(item.id, "up")}
              disabled={i === 0 || busyId === item.id}
              aria-label="Move up"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:text-ink active:text-ink disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => handleReorder(item.id, "down")}
              disabled={i === initial.length - 1 || busyId === item.id}
              aria-label="Move down"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-colors hover:text-ink active:text-ink disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              disabled={busyId === item.id}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 font-mono text-[10px] uppercase tracking-wide text-ink-muted transition-colors hover:border-magenta hover:text-magenta active:border-magenta active:text-magenta disabled:opacity-50"
            >
              {busyId === item.id && <Spinner size={10} />}
              Delete
            </button>
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line-strong p-4">
        <input
          type="text"
          value={pendingCaption}
          onChange={(e) => setPendingCaption(e.target.value)}
          placeholder="Caption for the next upload (optional)"
          className="rounded-lg border border-line bg-bg/60 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
        />
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            onChange={handleFileChange}
            disabled={isUploading}
            className="text-sm text-ink-muted file:mr-3 file:rounded-full file:border file:border-line-strong file:bg-transparent file:px-4 file:py-1.5 file:font-mono file:text-xs file:uppercase file:tracking-[0.15em] file:text-ink-muted"
          />
          {isUploading && (
            <span className="flex items-center gap-1.5 font-mono text-xs text-accent-bright">
              <Spinner size={13} /> Uploading…
            </span>
          )}
        </div>
        <span className="text-xs text-ink-faint">Photos or short video clips — up to 50MB each.</span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-magenta">
          {error}
        </p>
      )}
    </div>
  );
}
