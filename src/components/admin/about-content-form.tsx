"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Spinner } from "@/components/spinner";

export function AboutContentForm({
  initial,
}: {
  initial: { bio: string; photos: string[] };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState(initial.bio);
  const [photos, setPhotos] = useState(initial.photos);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      setPhotos((prev) => [...prev, blob.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setIsUploading(false);
      // Allow re-selecting the same file again afterward.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removePhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedAt(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/about", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, photos }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      setSavedAt(Date.now());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Bio / business description
        </span>
        <textarea
          required
          rows={6}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/40"
        />
        <span className="text-xs text-ink-faint">Shown in the homepage&apos;s About section.</span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Photos</span>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((url) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
                <Image src={url} alt="" fill className="object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-bg/80 text-ink-muted opacity-0 transition-opacity hover:text-magenta group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
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
        <span className="text-xs text-ink-faint">
          Shown as a small photo grid next to the bio. Leave empty to hide the grid entirely.
        </span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-magenta">
          {error}
        </p>
      )}
      {savedAt && !error && (
        <p role="status" className="text-sm text-mint">
          Saved.
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-white shadow-[0_0_30px_-6px_var(--color-accent)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting && <Spinner size={14} />}
          {isSubmitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
