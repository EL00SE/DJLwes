/** Escapes text for safe interpolation into a hand-built HTML email
 * template (order confirmations, admin notifications) — shared so every
 * template escapes the same way instead of each keeping its own copy. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
