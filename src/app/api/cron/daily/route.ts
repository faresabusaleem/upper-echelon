import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { flushEmailOutbox } from "@/lib/email";

/**
 * Daily housekeeping (Vercel Cron, Hobby plan: once a day). Clears expired rate-limit windows and
 * game sessions, old logs, unconfirmed sign-ups, and sends any email still waiting in the outbox.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!serverEnv.CRON_SECRET || auth !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("daily_maintenance");
  const email = await flushEmailOutbox(200);
  return Response.json({ ok: !error, maintenance: data, error: error?.message ?? null, email });
}
