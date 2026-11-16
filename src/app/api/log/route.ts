import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ipKey } from "@/lib/request";

const schema = z.object({
  message: z.string().max(1000),
  stack: z.string().max(4000).optional(),
  digest: z.string().max(100).optional(),
  url: z.string().max(500).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

/** Client error reports (error boundaries). Rate limited per IP hash; stored for 30 days. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 204 });
  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc("hit_rate_limit", { p_key: `log:${await ipKey()}`, p_max: 30, p_window_seconds: 3600 });
  if (allowed === false) return new Response(null, { status: 204 });
  const viewer = await getViewer().catch(() => null);
  await admin.from("error_logs").insert({
    level: "error",
    message: parsed.data.message,
    stack: parsed.data.stack ?? null,
    digest: parsed.data.digest ?? null,
    url: parsed.data.url ?? null,
    user_id: viewer?.id ?? null,
    user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    context: (parsed.data.context ?? {}) as never,
  });
  return new Response(null, { status: 204 });
}
