import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { errorJson } from "@/lib/api";

/** "Download my data": every row this member owns or took part in, read with their own session (RLS). */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return errorJson("Sign in first.", 401, "unauthenticated");
  const supabase = await createClient();
  const uid = viewer.id;
  const q = async <T,>(p: PromiseLike<{ data: T | null }>) => (await p).data ?? [];

  const conversations = await q(supabase.from("conversations").select("*"));
  const conversationIds = (conversations as Array<{ id: string }>).map((c) => c.id);

  const data = {
    exported_at: new Date().toISOString(),
    account: { id: uid, email: viewer.email, sign_in_methods: viewer.identities },
    profile: viewer.profile,
    private: await q(supabase.from("profile_private").select("*").eq("user_id", uid)),
    settings: viewer.settings,
    game_results: await q(supabase.from("game_results").select("*").eq("user_id", uid).order("created_at")),
    game_bests: await q(supabase.from("game_bests").select("*").eq("user_id", uid)),
    practice_days: await q(supabase.from("member_days").select("*").eq("user_id", uid).order("day")),
    achievements: await q(supabase.from("member_achievements").select("*").eq("user_id", uid)),
    tier_history: await q(supabase.from("tier_events").select("*").eq("user_id", uid)),
    test_results: await q(supabase.from("test_results").select("*").eq("user_id", uid)),
    threads: await q(supabase.from("threads").select("id, category_id, title, body, tags, created_at, edited_at").eq("author_id", uid)),
    replies: await q(supabase.from("posts").select("id, thread_id, body, created_at, edited_at").eq("author_id", uid)),
    thread_votes: await q(supabase.from("thread_votes").select("*").eq("user_id", uid)),
    reply_votes: await q(supabase.from("post_votes").select("*").eq("user_id", uid)),
    bookmarks: await q(supabase.from("bookmarks").select("*").eq("user_id", uid)),
    followed_threads: await q(supabase.from("thread_subscriptions").select("*").eq("user_id", uid)),
    drafts: await q(supabase.from("drafts").select("*").eq("user_id", uid)),
    poll_votes: await q(supabase.from("poll_votes").select("*").eq("user_id", uid)),
    following: await q(supabase.from("follows").select("*").eq("follower_id", uid)),
    followers: await q(supabase.from("follows").select("*").eq("followee_id", uid)),
    blocks: await q(supabase.from("blocks").select("*").eq("blocker_id", uid)),
    mutes: await q(supabase.from("mutes").select("*").eq("muter_id", uid)),
    conversations,
    messages: conversationIds.length
      ? await q(supabase.from("messages").select("*").in("conversation_id", conversationIds).order("created_at"))
      : [],
    notifications: await q(supabase.from("notifications").select("*").eq("user_id", uid)),
    reports_made: await q(supabase.from("reports").select("id, target_type, target_id, reason, details, status, created_at").eq("reporter_id", uid)),
    sanctions: await q(supabase.from("sanctions").select("kind, reason, created_at, expires_at, revoked_at").eq("user_id", uid)),
    uploads: await q(supabase.from("uploads").select("bucket, path, created_at").eq("user_id", uid)),
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="upper-echelon-${viewer.profile.username}-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
