// The site only serves events in Israel right now, so dates/times are
// always displayed in this timezone regardless of where the rendering
// server itself is physically located (e.g. Vercel's servers run in UTC,
// which would otherwise silently shift every displayed event time).
const EVENT_TIME_ZONE = "Asia/Jerusalem";

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: EVENT_TIME_ZONE,
  }).format(date);
}

export function formatEventTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: EVENT_TIME_ZONE,
  }).format(date);
}
