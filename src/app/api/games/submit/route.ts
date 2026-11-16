import { after } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { GAME_KINDS, dailyGame, isBetter } from "@/lib/games/catalog";
import { evaluate } from "@/lib/games/validate";
import { dbErrorJson, errorJson, json, sameOrigin } from "@/lib/api";
import { flushEmailOutbox } from "@/lib/email";

const body = z.object({
  sessionId: z.uuid(),
  game: z.enum(GAME_KINDS),
  details: z.unknown(),
});

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * Accepts a finished game. The score is recomputed on the server from raw observations, checked
 * against the rules and against the time since the session was issued, then stored.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return errorJson("Cross-site request refused.", 403);
  const viewer = await getViewer();
  if (!viewer || !viewer.profile.onboarded_at) return errorJson("Sign in to save results.", 401, "unauthenticated");
  if (viewer.ban) return errorJson("Your account is suspended.", 403, "forbidden");

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorJson("The result is malformed.", 400);
  const { sessionId, game, details } = parsed.data;

  const admin = createAdminClient();
  // Consume the session atomically: only an unused session of this member and game qualifies.
  const { data: session, error: sessionError } = await admin
    .from("game_sessions")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", viewer.id)
    .eq("game", game)
    .is("consumed_at", null)
    .select("started_at")
    .maybeSingle();
  if (sessionError) return dbErrorJson(sessionError);
  if (!session) return errorJson("This game session has already been used or does not exist.", 409, "conflict");

  const elapsed = Date.now() - new Date(session.started_at).getTime();
  if (elapsed > SESSION_TTL_MS) return errorJson("This game session expired. Start a new one.", 410, "conflict");

  const result = evaluate(game, details, elapsed);
  if (!result.ok) return errorJson(result.error, 422, "invalid");

  const { data: previous } = await admin
    .from("game_bests")
    .select("best_score")
    .eq("user_id", viewer.id)
    .eq("game", game)
    .maybeSingle();

  const isDaily = game === dailyGame();
  const { error: insertError } = await admin.from("game_results").insert({
    user_id: viewer.id,
    game,
    score: result.score,
    rating: result.rating,
    details: result.details as never,
    is_daily: isDaily,
    is_flagged: result.flagged,
    flag_reason: result.reason,
  });
  if (insertError) return dbErrorJson(insertError);

  const [{ data: percentile }, { data: population }, { data: streak }, { data: profile }] = await Promise.all([
    admin.rpc("game_percentile", { g: game, s: result.score }),
    admin.rpc("game_population", { g: game }),
    admin.rpc("current_streak", { uid: viewer.id }),
    admin.from("profiles").select("tier, echelon_score").eq("id", viewer.id).single(),
  ]);

  after(() => flushEmailOutbox(10));

  const prev = previous?.best_score != null ? Number(previous.best_score) : null;
  return json({
    ok: true,
    score: result.score,
    rating: result.rating,
    flagged: result.flagged,
    personalBest: !result.flagged && isBetter(game, result.score, prev),
    previousBest: prev,
    percentile: percentile == null ? null : Number(percentile),
    population: population ?? 0,
    streak: streak ?? 0,
    isDaily,
    tier: profile?.tier ?? viewer.profile.tier,
    tierBefore: viewer.profile.tier,
    echelonScore: profile?.echelon_score ?? null,
  });
}
