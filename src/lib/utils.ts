export function cn(...parts: unknown[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(" ");
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31536000],
  ["month", 2592000],
  ["week", 604800],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 hours ago", "yesterday", "just now". */
export function timeAgo(date: string | Date, now = Date.now()): string {
  const t = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const diff = Math.round((t - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 45) return "just now";
  for (const [unit, secs] of UNITS) {
    if (abs >= secs || unit === "minute") return rtf.format(Math.round(diff / secs), unit);
  }
  return "just now";
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
export function formatDate(date: string | Date): string {
  return dateFmt.format(typeof date === "string" ? new Date(date) : date);
}

const shortFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export function formatShortDate(date: string | Date): string {
  return shortFmt.format(typeof date === "string" ? new Date(date) : date);
}

export function slugify(input: string, max = 60): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/g, "") || "thread"
  );
}

export function pluralise(n: number, one: string, many = `${one}s`) {
  return `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "").toUpperCase() : "");
}

/** Safe relative redirect target: only same-site paths are allowed. */
export function safeNext(next: string | null | undefined, fallback = "/home"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = Math.round(n) % 100;
  return `${Math.round(n)}${s[(v - 20) % 10] || s[v] || s[0]}`;
}
