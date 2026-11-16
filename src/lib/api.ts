import "server-only";
import { NextResponse } from "next/server";
import { toActionError } from "@/lib/errors";

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function errorJson(message: string, status: number, kind = "error") {
  return NextResponse.json({ ok: false, kind, message }, { status });
}

/** Maps a database error to an HTTP response with a calm message. */
export function dbErrorJson(error: { code?: string; message?: string; hint?: string }) {
  const e = toActionError(error);
  const status =
    e.kind === "rate_limited" ? 429 : e.kind === "forbidden" ? 403 : e.kind === "not_found" ? 404 : e.kind === "unauthenticated" ? 401 : 400;
  return NextResponse.json(e, { status });
}

/** Same-origin check for state-changing JSON endpoints (Server Actions check this themselves). */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // non-browser clients still need a valid session cookie
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
