import "server-only";
import { after } from "next/server";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ipKey } from "@/lib/request";

const NOT_A_PERSON = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|lighthouse|headless|playwright|curl|wget/i;

/**
 * Notes that this visitor is here, for "who is here" on the hub. Members are keyed by id, visitors
 * by a salted hash of their IP (never the IP itself). The database ignores repeats within 90 s, and
 * the write happens after the response so it never slows a page down.
 */
export async function notePresence(userId: string | null) {
  const ua = (await headers()).get("user-agent") ?? "";
  if (!ua || NOT_A_PERSON.test(ua)) return;
  const key = userId ? `u:${userId}` : `g:${await ipKey()}`;
  after(async () => {
    try {
      await createAdminClient().rpc("record_presence", { p_key: key, p_user: userId ?? undefined });
    } catch {
      // Presence is a nicety; never let it break a page.
    }
  });
}
