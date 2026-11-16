export type ActionErrorKind =
  | "rate_limited"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "invalid"
  | "locked"
  | "unauthenticated"
  | "too_young"
  | "unknown";

export type ActionResult<T = undefined> =
  | ({ ok: true; message?: string } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; kind: ActionErrorKind; message: string; fieldErrors?: Record<string, string> };

type PgLikeError = { code?: string; message?: string; hint?: string; details?: string } | null | undefined;

const CODE_KIND: Record<string, ActionErrorKind> = {
  UE429: "rate_limited",
  UE403: "forbidden",
  UE404: "not_found",
  UE409: "conflict",
  UE400: "invalid",
  UE423: "locked",
  UE401: "unauthenticated",
  UE413: "too_young",
  "42501": "forbidden",
  "23505": "conflict",
  "23514": "invalid",
  PGRST116: "not_found",
};

/** Turns a database or API error into a calm, human message. Our own errors carry safe text. */
export function toActionError(error: PgLikeError, fallback = "Something went wrong. Try again in a moment.") {
  const code = error?.code ?? "";
  const kind = CODE_KIND[code] ?? "unknown";
  let message = fallback;
  if (code.startsWith("UE") && error?.message) message = error.message;
  if (kind === "rate_limited") {
    const secs = Number(error?.hint);
    const wait = Number.isFinite(secs) && secs > 0 ? humaniseSeconds(secs) : "a little while";
    message = `You are moving faster than the house allows. Try again in ${wait}.`;
  } else if (code === "42501") {
    message = "You do not have permission to do that.";
  } else if (code === "23505") {
    message = "That already exists.";
  } else if (code === "23514") {
    message = "Some of what you entered is outside the allowed limits.";
  }
  return { ok: false as const, kind, message };
}

export function humaniseSeconds(s: number): string {
  if (s < 90) return `${Math.round(s)} seconds`;
  if (s < 5400) return `${Math.round(s / 60)} minutes`;
  if (s < 129600) return `${Math.round(s / 3600)} hours`;
  return `${Math.round(s / 86400)} days`;
}

export function fail(kind: ActionErrorKind, message: string, fieldErrors?: Record<string, string>) {
  return { ok: false as const, kind, message, fieldErrors };
}
