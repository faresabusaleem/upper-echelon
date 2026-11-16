import "server-only";
import { serverEnv } from "@/lib/env.server";

/** Verifies a Cloudflare Turnstile token on the server. */
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: serverEnv.TURNSTILE_SECRET_KEY, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
