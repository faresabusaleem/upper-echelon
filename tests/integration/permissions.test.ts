/**
 * Permission and policy tests against a real Supabase (local stack or CI service).
 * Run: npx supabase start && npm run test:integration
 * Skipped automatically when SUPABASE_TEST_URL / keys are not set.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const URL = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const PUBLISHABLE = process.env.SUPABASE_TEST_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_TEST_SECRET_KEY;
const enabled = !!PUBLISHABLE && !!SECRET;

type Client = SupabaseClient<Database>;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

async function member(admin: Client, name: string, extra: Record<string, unknown> = {}) {
  const email = `${name}-${randomUUID().slice(0, 8)}@test.invalid`;
  const password = `Pw-${randomUUID()}`;
  const username = `${name}_${randomUUID().slice(0, 6)}`.slice(0, 20);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: name, date_of_birth: "2000-01-01", ...extra },
  });
  if (error) throw error;
  await admin.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", data.user.id);
  const client = createClient<Database>(URL, PUBLISHABLE!, opts);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, username, client };
}

describe.skipIf(!enabled)("row-level security and database rules", () => {
  let admin: Client;
  let a: Awaited<ReturnType<typeof member>>;
  let b: Awaited<ReturnType<typeof member>>;
  let mod: Awaited<ReturnType<typeof member>>;
  let anon: Client;
  let categoryId: number;
  let threadId: number;
  const created: string[] = [];

  beforeAll(async () => {
    admin = createClient<Database>(URL, SECRET!, opts);
    anon = createClient<Database>(URL, PUBLISHABLE!, opts);
    a = await member(admin, "alice");
    b = await member(admin, "bruno");
    mod = await member(admin, "mira");
    created.push(a.id, b.id, mod.id);
    await admin.from("profiles").update({ role: "moderator" }).eq("id", mod.id);
    const { data } = await admin.from("forum_categories").select("id").eq("slug", "philosophy").single();
    categoryId = data!.id;
    const { data: t, error } = await a.client.from("threads").insert({ category_id: categoryId, title: "A thread for testing rules", body: "Body" }).select("id").single();
    if (error) throw error;
    threadId = t.id;
  }, 60_000);

  afterAll(async () => {
    for (const id of created) {
      await admin.rpc("prepare_account_deletion", { uid: id });
      await admin.auth.admin.deleteUser(id);
    }
  });

  it("refuses sign-ups under 13", async () => {
    const { error } = await admin.auth.admin.createUser({
      email: `young-${randomUUID().slice(0, 6)}@test.invalid`,
      password: "Pw-young-123456",
      email_confirm: true,
      user_metadata: { username: `young_${randomUUID().slice(0, 6)}`, date_of_birth: new Date().toISOString().slice(0, 10) },
    });
    expect(error).not.toBeNull();
  });

  it("never exposes dates of birth or other members' settings", async () => {
    const { data: priv } = await b.client.from("profile_private").select("*");
    expect(priv?.every((r) => r.user_id === b.id)).toBe(true);
    const { data: settings } = await b.client.from("user_settings").select("user_id");
    expect(settings?.map((s) => s.user_id)).toEqual([b.id]);
    const { data: anonPriv } = await anon.from("profile_private").select("*");
    expect(anonPriv ?? []).toHaveLength(0);
  });

  it("blocks privilege escalation through protected columns", async () => {
    const { error: role } = await b.client.from("profiles").update({ role: "admin" }).eq("id", b.id);
    expect(role?.message).toMatch(/permission denied/);
    const { error: tier } = await b.client.from("profiles").update({ tier: 6, echelon_score: 1000 }).eq("id", b.id);
    expect(tier?.message).toMatch(/permission denied/);
    const { data } = await admin.from("profiles").select("role, tier").eq("id", b.id).single();
    expect(data).toEqual({ role: "member", tier: 1 });
  });

  it("lets members edit only their own profile, and rejects reserved names", async () => {
    await b.client.from("profiles").update({ bio: "hijack" }).eq("id", a.id);
    const { data } = await admin.from("profiles").select("bio").eq("id", a.id).single();
    expect(data?.bio).toBeNull();
    const { error } = await b.client.from("profiles").update({ username: "admin" }).eq("id", b.id);
    expect(error?.code).toBe("UE409");
  });

  it("only the server can write game results", async () => {
    const { error } = await b.client.from("game_results").insert({ user_id: b.id, game: "reaction", score: 90, rating: 100 });
    expect(error?.message).toMatch(/permission denied/);
  });

  it("updates bests, practice days, score and achievements when the server stores a result", async () => {
    const { error } = await admin.from("game_results").insert({ user_id: b.id, game: "sequence", score: 9, rating: 55 });
    expect(error).toBeNull();
    const { data: best } = await admin.from("game_bests").select("best_score, plays").eq("user_id", b.id).eq("game", "sequence").single();
    expect(Number(best?.best_score)).toBe(9);
    const { data: p } = await admin.from("profiles").select("mind_score, practice_score, echelon_score").eq("id", b.id).single();
    expect(p?.mind_score).toBe(Math.round((5 * 55) / 8));
    expect(p?.practice_score).toBe(3);
    const { data: ach } = await admin.from("member_achievements").select("code").eq("user_id", b.id);
    expect(ach?.map((x) => x.code)).toContain("first_trial");
  });

  it("hides game stats when the owner makes them private", async () => {
    await b.client.from("user_settings").update({ game_stats_visibility: "only_me" }).eq("user_id", b.id);
    const { data: seen } = await a.client.from("game_bests").select("*").eq("user_id", b.id);
    expect(seen).toHaveLength(0);
    const { data: own } = await b.client.from("game_bests").select("*").eq("user_id", b.id);
    expect(own?.length).toBeGreaterThan(0);
    await b.client.from("user_settings").update({ game_stats_visibility: "everyone" }).eq("user_id", b.id);
  });

  it("forbids moderator actions to members and audits them for moderators", async () => {
    const { error } = await b.client.rpc("mod_set_thread_flags", { p_thread: threadId, p_pinned: true, p_locked: false });
    expect(error?.code).toBe("UE403");
    const { error: modError } = await mod.client.rpc("mod_set_thread_flags", { p_thread: threadId, p_pinned: true, p_locked: false });
    expect(modError).toBeNull();
    const { data: log } = await admin.from("audit_log").select("action").eq("actor_id", mod.id);
    expect(log?.map((l) => l.action)).toContain("thread_flags");
  });

  it("stops members voting on their own writing and voting twice", async () => {
    const own = await a.client.from("thread_votes").insert({ user_id: a.id, thread_id: threadId });
    expect(own.error?.code).toBe("UE403");
    expect((await b.client.from("thread_votes").insert({ user_id: b.id, thread_id: threadId })).error).toBeNull();
    expect((await b.client.from("thread_votes").insert({ user_id: b.id, thread_id: threadId })).error?.code).toBe("23505");
    const { data } = await admin.from("profiles").select("reputation").eq("id", a.id).single();
    expect(data?.reputation).toBe(2);
  });

  it("notifies the thread author of replies and mentioned members of mentions", async () => {
    await b.client.from("posts").insert({ thread_id: threadId, body: `A reply mentioning @${mod.username}` });
    const { data: forA } = await admin.from("notifications").select("kind").eq("user_id", a.id);
    const { data: forMod } = await admin.from("notifications").select("kind").eq("user_id", mod.id);
    expect(forA?.map((n) => n.kind)).toContain("reply");
    expect(forMod?.map((n) => n.kind)).toContain("mention");
  });

  it("rate-limits thread creation", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push(await b.client.from("threads").insert({ category_id: categoryId, title: `Rate limit probe ${i}`, body: "x" }));
    }
    expect(results.some((r) => r.error?.code === "UE429")).toBe(true);
  });

  it("enforces direct-message privacy: default is people I follow", async () => {
    const before = await a.client.rpc("start_conversation", { other: b.id });
    expect(before.error?.code).toBe("UE403");
    await b.client.from("follows").insert({ follower_id: b.id, followee_id: a.id });
    const after = await a.client.rpc("start_conversation", { other: b.id });
    expect(after.error).toBeNull();
    const send = await a.client.from("messages").insert({ conversation_id: after.data!, body: "Hello" });
    expect(send.error).toBeNull();
    const { data: outsider } = await mod.client.from("messages").select("*").eq("conversation_id", after.data!);
    expect(outsider).toHaveLength(0);
  });

  it("blocking removes follows and prevents messages", async () => {
    await a.client.from("blocks").insert({ blocker_id: a.id, blocked_id: b.id });
    const { data: follows } = await admin.from("follows").select("*").eq("follower_id", b.id).eq("followee_id", a.id);
    expect(follows).toHaveLength(0);
    const { data: conv } = await admin.from("conversations").select("id").or(`user_a.eq.${b.id},user_b.eq.${b.id}`).limit(1).single();
    const send = await b.client.from("messages").insert({ conversation_id: conv!.id, body: "Still there?" });
    expect(send.error?.code).toBe("UE403");
    await a.client.from("blocks").delete().eq("blocker_id", a.id).eq("blocked_id", b.id);
  });

  it("muted members cannot post until the mute is lifted", async () => {
    const { data: sid } = await mod.client.rpc("mod_sanction", { p_user: b.id, p_kind: "mute", p_reason: "test", p_hours: 1 });
    const blocked = await b.client.from("posts").insert({ thread_id: threadId, body: "muted?" });
    expect(blocked.error?.code).toBe("UE403");
    await mod.client.rpc("mod_revoke_sanction", { p_sanction: sid! });
    const ok = await b.client.from("posts").insert({ thread_id: threadId, body: "back" });
    expect(ok.error).toBeNull();
  });

  it("keeps the Inner Room closed below the third tier", async () => {
    const { data: room } = await admin.from("forum_categories").select("id").eq("slug", "inner-room").single();
    const { data: visible } = await b.client.from("forum_categories").select("id").eq("id", room!.id);
    expect(visible).toHaveLength(0);
    const post = await b.client.from("threads").insert({ category_id: room!.id, title: "Can I get in?", body: "?" });
    expect(post.error?.code).toBe("UE403");
  });

  it("stores a snapshot with each report and lets only moderators see the queue", async () => {
    const { data: post } = await admin.from("posts").select("id").eq("thread_id", threadId).limit(1).single();
    const r = await a.client.from("reports").insert({ target_type: "post", target_id: String(post!.id), reason: "spam" });
    expect(r.error).toBeNull();
    const { data: asB } = await b.client.from("reports").select("*");
    expect(asB).toHaveLength(0);
    const { data: asMod } = await mod.client.from("reports").select("snapshot").eq("target_id", String(post!.id));
    expect((asMod?.[0]?.snapshot as { body?: string })?.body).toBeTruthy();
  });

  it("does not let anyone probe other members' follows, blocks or streaks", async () => {
    const probe = await anon.rpc("is_following" as never, { a: a.id, b: b.id } as never);
    expect(probe.error).not.toBeNull();
    const blocks = await b.client.rpc("is_blocked_between" as never, { a: a.id, b: mod.id } as never);
    expect(blocks.error).not.toBeNull();
    const pair = await b.client.rpc("can_message", { sender: a.id, recipient: mod.id });
    expect(pair.data).toBe(false);
    await b.client.from("user_settings").update({ activity_visibility: "only_me", game_stats_visibility: "only_me" }).eq("user_id", b.id);
    const { data: streak } = await a.client.rpc("longest_streak", { uid: b.id });
    expect(streak).toBe(0);
    const { data: own } = await b.client.rpc("longest_streak", { uid: b.id });
    expect(own).toBeGreaterThan(0);
    await b.client.from("user_settings").update({ activity_visibility: "everyone", game_stats_visibility: "everyone" }).eq("user_id", b.id);
  });

  it("exposes percentiles to visitors without exposing anyone's results", async () => {
    const { data, error } = await anon.rpc("game_percentile", { g: "sequence", s: 20 });
    expect(error).toBeNull();
    expect(Number(data)).toBeGreaterThan(0);
  });
});
