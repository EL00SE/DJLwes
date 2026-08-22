// The site only serves events in Israel right now, so dates/times are
// always displayed in this timezone regardless of where the rendering
// server itself is physically located (e.g. Vercel's servers run in UTC,
// which would otherwise silently shift every displayed event time).
export const EVENT_TIME_ZONE = "Asia/Jerusalem";

/** Splits a freeform newline-separated admin field (e.g. `Event.lineup`,
 * `Event.entryRequirements`) into a clean list of non-empty lines —
 * shared so every "one item per line" field parses the same way. */
export function parseLines(text: string | null | undefined): string[] {
  return (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

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

/** For timestamps that aren't the event date itself (e.g. "when was this
 * order placed") but should still read correctly regardless of which
 * timezone the rendering server happens to be in. */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: EVENT_TIME_ZONE,
  }).format(date);
}

/** How far `timeZone`'s wall clock is ahead of UTC, in minutes, at the
 * instant `date` represents. Positive for zones ahead of UTC (e.g. +180
 * for Israel Daylight Time). Used to convert between the admin's
 * Israel-local form input and the UTC instant Postgres actually stores. */
function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return (asUtc - date.getTime()) / 60_000;
}

/** Converts a `datetime-local` input value (e.g. "2026-08-21T21:00"),
 * interpreted as Israel wall-clock time, into the correct UTC Date
 * instant to store. The naive `new Date(value)` would instead interpret
 * it in the *server's* local time (UTC on Vercel), silently shifting
 * every event saved from the admin panel by the Israel/UTC offset. */
export function parseEventLocalDateTime(value: string): Date {
  const naiveUtc = new Date(`${value}:00.000Z`);
  const offsetMinutes = timeZoneOffsetMinutes(naiveUtc, EVENT_TIME_ZONE);
  return new Date(naiveUtc.getTime() - offsetMinutes * 60_000);
}

/** The inverse of parseEventLocalDateTime — formats a stored UTC instant
 * as the Israel-local "YYYY-MM-DDTHH:mm" string a `datetime-local` input
 * expects, so editing an existing event shows its actual local time. */
export function toEventLocalDateTimeInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
