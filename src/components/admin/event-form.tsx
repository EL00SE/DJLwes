"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

export type EventFormInitialValues = {
  id: string;
  title: string;
  description: string;
  /** Already formatted for a `datetime-local` input (Israel-local wall time). */
  dateLocalValue: string;
  location: string;
  coverImage: string;
  buyLink: string;
  lineup: string;
  entryRequirements: string;
  isActive: boolean;
};

export function EventForm({ initial }: { initial?: EventFormInitialValues }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dateLocalValue, setDateLocalValue] = useState(initial?.dateLocalValue ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [buyLink, setBuyLink] = useState(initial?.buyLink ?? "");
  const [lineup, setLineup] = useState(initial?.lineup ?? "");
  const [entryRequirements, setEntryRequirements] = useState(initial?.entryRequirements ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setCoverImage(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setIsUploading(false);
      // Allow re-selecting the same file (e.g. after fixing something and
      // re-uploading) — otherwise the browser won't fire onChange again.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!coverImage) {
      setError("Upload a cover image before saving.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const body = {
        title,
        description,
        date: dateLocalValue,
        location,
        coverImage,
        buyLink,
        lineup,
        entryRequirements,
        isActive,
      };
      const res = await fetch(isEdit ? `/api/admin/events/${initial!.id}` : "/api/admin/events", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Title</span>
        <input
          required
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Description</span>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors focus:border-accent"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Date &amp; time
          </span>
          <input
            required
            type="datetime-local"
            value={dateLocalValue}
            onChange={(e) => setDateLocalValue(e.target.value)}
            className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Location</span>
          <input
            required
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors focus:border-accent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Buy link <span className="normal-case text-ink-faint">(Grow checkout page)</span>
        </span>
        <input
          type="url"
          value={buyLink}
          onChange={(e) => setBuyLink(e.target.value)}
          placeholder="https://pay.grow.link/..."
          className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
        />
        <span className="text-xs text-ink-faint">
          Leave blank while pricing/tickets aren&apos;t set up in Grow yet — the homepage shows a
          disabled button until this is filled in.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Lineup <span className="normal-case text-ink-faint">(optional, one act per line)</span>
        </span>
        <textarea
          rows={3}
          value={lineup}
          onChange={(e) => setLineup(e.target.value)}
          placeholder={"Nadia K\nJonas R"}
          className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
        />
        <span className="text-xs text-ink-faint">
          Leave blank to hide the lineup section on the homepage entirely.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Entry requirements{" "}
          <span className="normal-case text-ink-faint">(optional, one rule per line)</span>
        </span>
        <textarea
          rows={3}
          value={entryRequirements}
          onChange={(e) => setEntryRequirements(e.target.value)}
          placeholder={"Mixed groups only after 1am\nValid ID required\n21+"}
          className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
        />
        <span className="text-xs text-ink-faint">
          Shown to buyers before they click through to Grow — door policies, ID rules, age limits,
          that kind of thing. Leave blank to hide the section entirely.
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Cover image</span>
        <div className="flex items-center gap-4">
          {coverImage ? (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line">
              <Image src={coverImage} alt="Cover preview" fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-line text-center font-mono text-[10px] text-ink-faint">
              No image
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={isUploading}
              className="text-sm text-ink-muted file:mr-3 file:rounded-full file:border file:border-line-strong file:bg-transparent file:px-4 file:py-1.5 file:font-mono file:text-xs file:uppercase file:tracking-[0.15em] file:text-ink-muted"
            />
            {isUploading && <span className="font-mono text-xs text-accent-bright">Uploading…</span>}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4 rounded border-line-strong"
        />
        <span>
          Make this the live event on the homepage
          <span className="ml-1.5 text-ink-faint">(replaces whichever event is active now)</span>
        </span>
      </label>

      {error && <p className="text-sm text-magenta">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="rounded-full bg-accent px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-white shadow-[0_0_30px_-6px_var(--color-accent)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Create event"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/events")}
          className="rounded-full border border-line-strong px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-ink-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
