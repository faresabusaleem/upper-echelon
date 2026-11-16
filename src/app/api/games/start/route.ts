import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GAME_KINDS } from "@/lib/games/catalog";
import { dbErrorJson, errorJson, json, sameOrigin } from "@/lib/api";

const body = z.object({ game: z.enum(GAME_KINDS) });

/** Issues a single-use session for a game. Results are only accepted against a session. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return errorJson("Cross-site request refused.", 403);
  const viewer = await getViewer();
  if (!viewer || !viewer.profile.onboarded_at) return errorJson("Sign in to save results.", 401, "unauthenticated");
  if (viewer.ban) return errorJson("Your account is suspended.", 403, "forbidden");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorJson("Unknown game.", 400);

  const admin = createAdminClient();
  const { data: allowed, error: rlError } = await admin.rpc("hit_rate_limit", {
    p_key: `gamestart:${viewer.id}`,
    p_max: 400,
    p_window_seconds: 3600,
  });
  if (rlError) return dbErrorJson(rlError);
  if (!allowed) return errorJson("Too many games in a short time. Rest a moment.", 429, "rate_limited");

  const { data, error } = await admin
    .from("game_sessions")
    .insert({ user_id: viewer.id, game: parsed.data.game })
    .select("id")
    .single();
  if (error) return dbErrorJson(error);
  return json({ ok: true, sessionId: data.id });
}
