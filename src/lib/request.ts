import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env.server";

/** The caller's IP as reported by the platform (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** A salted, one-way hash of the IP. Used for rate limiting; the IP itself is never stored. */
export async function ipKey(): Promise<string> {
  const ip = (await clientIp()) ?? "unknown";
  return createHash("sha256").update(`${serverEnv.IP_HASH_SALT}:${ip}`).digest("hex").slice(0, 32);
}
