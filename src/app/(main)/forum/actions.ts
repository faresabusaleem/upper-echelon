"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fail, toActionError, type ActionResult } from "@/lib/errors";
import { renderMarkdown } from "@/lib/markdown";
import { flushEmailOutbox } from "@/lib/email";
import { fieldErrors } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export type ForumState = ActionResult | null;

async function writer() {
  const viewer = await getViewer();
  if (!viewer?.profile.onboarded_at) return { viewer: null, error: fail("unauthenticated", "Sign in to take part.") };
  if (viewer.ban) return { viewer: null, error: fail("forbidden", "Your account is suspended.") };
  if (viewer.mute) return { viewer: null, error: fail("forbidden", "You are muted and cannot post until the mute ends.") };
  return { viewer, error: null };
}

const bodySchema = z.string().trim().min(1, "Write something first.").max(20000, "At most 20,000 characters.");
const tagsSchema = z
  .string()
  .max(200)
  .transform((s) =>
    s
      .split(/[,\s]+/)
      .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
      .filter(Boolean)
      .slice(0, 5),
  );

const threadSchema = z.object({
  category_id: z.coerce.number().int().positive("Choose a category."),
  title: z.string().trim().min(6, "Titles need at least 6 characters.").max(140, "At most 140 characters."),
  body: bodySchema,
  tags: tagsSchema,
  directory_test_id: z.uuid().optional().or(z.literal("")),
  poll_question: z.string().trim().max(200).optional().default(""),
  poll_options: z.string().max(2000).optional().default(""),
  poll_multiple: z.boolean(),
  poll_days: z.coerce.number().int().min(0).max(60).default(0),
});

export async function createThreadAction(_: ForumState, formData: FormData): Promise<ForumState> {
  const { viewer, error: authError } = await writer();
  if (!viewer) return authError;
  const parsed = threadSchema.safeParse({
    category_id: formData.get("category_id"),
    title: formData.get("title"),
    body: formData.get("body"),
    tags: formData.get("tags") ?? "",
    directory_test_id: formData.get("directory_test_id") ?? "",
    poll_question: formData.get("poll_question") ?? "",
    poll_options: formData.get("poll_options") ?? "",
    poll_multiple: formData.get("poll_multiple") === "on",
    poll_days: formData.get("poll_days") || 0,
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return fail("invalid", Object.values(errors)[0], errors);
  }
  const d = parsed.data;
  const options = d.poll_options
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (d.poll_question && options.length < 2) {
    return fail("invalid", "A poll needs at least two options, one per line.", { poll_options: "At least two options." });
  }

  const supabase = await createClient();
  const { data: thread, error } = await supabase
    .from("threads")
    .insert({
      category_id: d.category_id,
      title: d.title,
      body: d.body,
      tags: d.tags,
      directory_test_id: d.directory_test_id || null,
    })
    .select("id")
    .single();
  if (error) return toActionError(error);

  if (d.poll_question) {
    const { error: pollError } = await supabase.from("polls").insert({
      thread_id: thread.id,
      question: d.poll_question,
      options,
      allow_multiple: d.poll_multiple,
      closes_at: d.poll_days > 0 ? new Date(Date.now() + d.poll_days * 86400000).toISOString() : null,
    });
    if (pollError) return toActionError(pollError);
  }
  await supabase.from("drafts").delete().eq("user_id", viewer.id).is("thread_id", null);
  after(() => flushEmailOutbox(20));
  revalidatePath("/forum");
  redirect(`/forum/t/${thread.id}/${slugify(d.title)}`);
}

export async function updateThreadAction(_: ForumState, formData: FormData): Promise<ForumState> {
  const { viewer, error: authError } = await writer();
  if (!viewer) return authError;
  const id = Number(formData.get("id"));
  const parsed = z
    .object({ title: threadSchema.shape.title, body: bodySchema, tags: tagsSchema })
    .safeParse({ title: formData.get("title"), body: formData.get("body"), tags: formData.get("tags") ?? "" });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return fail("invalid", Object.values(errors)[0], errors);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("threads").update(parsed.data).eq("id", id).eq("author_id", viewer.id);
  if (error) return toActionError(error);
  revalidatePath(`/forum/t/${id}`);
  return { ok: true, message: "Saved." };
}

export async function deleteThreadAction(id: number): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("unauthenticated", "Sign in first.");
  const supabase = await createClient();
  const { error } = await supabase.from("threads").delete().eq("id", id).eq("author_id", viewer.id);
  if (error) return toActionError(error);
  revalidatePath("/forum");
  redirect("/forum");
}

export async function createReplyAction(_: ForumState, formData: FormData): Promise<ForumState> {
  const { viewer, error: authError } = await writer();
  if (!viewer) return authError;
  const threadId = Number(formData.get("thread_id"));
  const parsed = bodySchema.safeParse(formData.get("body"));
  if (!parsed.success) return fail("invalid", parsed.error.issues[0].message, { body: parsed.error.issues[0].message });
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").insert({ thread_id: threadId, body: parsed.data }).select("id").single();
  if (error) return toActionError(error);
  await supabase.from("drafts").delete().eq("user_id", viewer.id).eq("thread_id", threadId);
  after(() => flushEmailOutbox(20));
  revalidatePath(`/forum/t/${threadId}`);
  return { ok: true, message: `r${data.id}` };
}

export async function updateReplyAction(_: ForumState, formData: FormData): Promise<ForumState> {
  const { viewer, error: authError } = await writer();
  if (!viewer) return authError;
  const id = Number(formData.get("id"));
  const parsed = bodySchema.safeParse(formData.get("body"));
  if (!parsed.success) return fail("invalid", parsed.error.issues[0].message, { body: parsed.error.issues[0].message });
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").update({ body: parsed.data }).eq("id", id).eq("author_id", viewer.id).select("thread_id").single();
  if (error) return toActionError(error);
  revalidatePath(`/forum/t/${data.thread_id}`);
  return { ok: true, message: "Saved." };
}

export async function deleteReplyAction(id: number, threadId: number): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("unauthenticated", "Sign in first.");
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", id).eq("author_id", viewer.id);
  if (error) return toActionError(error);
  revalidatePath(`/forum/t/${threadId}`);
  return { ok: true };
}

export async function voteAction(kind: "thread" | "post", id: number, on: boolean, threadId: number): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.profile.onboarded_at) return fail("unauthenticated", "Sign in to vote.");
  const supabase = await createClient();
  const { error } =
    kind === "thread"
      ? on
        ? await supabase.from("thread_votes").insert({ user_id: viewer.id, thread_id: id })
        : await supabase.from("thread_votes").delete().eq("user_id", viewer.id).eq("thread_id", id)
      : on
        ? await supabase.from("post_votes").insert({ user_id: viewer.id, post_id: id })
        : await supabase.from("post_votes").delete().eq("user_id", viewer.id).eq("post_id", id);
  if (error && error.code !== "23505") return toActionError(error);
  revalidatePath(`/forum/t/${threadId}`);
  return { ok: true };
}

export async function toggleBookmarkAction(threadId: number, on: boolean): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.profile.onboarded_at) return fail("unauthenticated", "Sign in to bookmark.");
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("bookmarks").insert({ user_id: viewer.id, thread_id: threadId })
    : await supabase.from("bookmarks").delete().eq("user_id", viewer.id).eq("thread_id", threadId);
  if (error && error.code !== "23505") return toActionError(error);
  revalidatePath("/forum/bookmarks");
  return { ok: true };
}

export async function toggleFollowThreadAction(threadId: number, on: boolean): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.profile.onboarded_at) return fail("unauthenticated", "Sign in to follow threads.");
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("thread_subscriptions").insert({ user_id: viewer.id, thread_id: threadId })
    : await supabase.from("thread_subscriptions").delete().eq("user_id", viewer.id).eq("thread_id", threadId);
  if (error && error.code !== "23505") return toActionError(error);
  return { ok: true };
}

export async function markSolutionAction(threadId: number, postId: number | null): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("unauthenticated", "Sign in first.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_solution", { p_thread: threadId, p_post: postId as number });
  if (error) return toActionError(error);
  after(() => flushEmailOutbox(5));
  revalidatePath(`/forum/t/${threadId}`);
  return { ok: true };
}

export async function votePollAction(pollId: number, options: number[], threadId: number): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.profile.onboarded_at) return fail("unauthenticated", "Sign in to vote.");
  if (options.length === 0) return fail("invalid", "Choose an option.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("poll_votes")
    .insert(options.slice(0, 10).map((o) => ({ poll_id: pollId, user_id: viewer.id, option_index: o })));
  if (error) return toActionError(error);
  revalidatePath(`/forum/t/${threadId}`);
  return { ok: true };
}

/** Autosaved drafts: one per thread for replies, one for a new thread. */
export async function saveDraftAction(input: {
  threadId?: number | null;
  categoryId?: number | null;
  title?: string;
  body: string;
}): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer?.profile.onboarded_at) return fail("unauthenticated", "Sign in first.");
  const body = input.body.slice(0, 20000);
  const supabase = await createClient();
  if (input.threadId) {
    if (!body.trim()) {
      await supabase.from("drafts").delete().eq("user_id", viewer.id).eq("thread_id", input.threadId);
      return { ok: true };
    }
    const { error } = await supabase
      .from("drafts")
      .upsert(
        { user_id: viewer.id, thread_id: input.threadId, body, updated_at: new Date().toISOString() },
        { onConflict: "user_id,thread_id" },
      );
    if (error) return toActionError(error);
    return { ok: true };
  }
  await supabase.from("drafts").delete().eq("user_id", viewer.id).is("thread_id", null);
  if (body.trim() || input.title?.trim()) {
    const { error } = await supabase.from("drafts").insert({
      user_id: viewer.id,
      category_id: input.categoryId ?? null,
      title: (input.title ?? "").slice(0, 140),
      body,
    });
    if (error) return toActionError(error);
  }
  return { ok: true };
}

export async function previewAction(source: string): Promise<string> {
  return renderMarkdown(source);
}

export async function mentionSuggestions(prefix: string): Promise<Array<{ username: string; display_name: string }>> {
  if (!/^[A-Za-z0-9_]{1,20}$/.test(prefix)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name")
    .ilike("username", `${prefix}%`)
    .not("onboarded_at", "is", null)
    .limit(6);
  return (data ?? []).map((d) => ({ username: d.username as string, display_name: d.display_name }));
}

// ---------------------------------------------------------------------------------------------
// Moderator controls used on the thread page
// ---------------------------------------------------------------------------------------------
export async function modThreadFlagsAction(threadId: number, pinned: boolean | null, locked: boolean | null): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_set_thread_flags", {
    p_thread: threadId,
    p_pinned: pinned as boolean,
    p_locked: locked as boolean,
  });
  if (error) return toActionError(error);
  revalidatePath(`/forum/t/${threadId}`);
  return { ok: true };
}

export async function modRemoveAction(type: "thread" | "post", id: number, removed: boolean, reason: string, threadId: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_set_removed", {
    p_type: type,
    p_id: String(id),
    p_removed: removed,
    p_reason: reason || (null as unknown as string),
  });
  if (error) return toActionError(error);
  revalidatePath(`/forum/t/${threadId}`);
  revalidatePath("/forum");
  return { ok: true };
}

export async function modMoveThreadAction(threadId: number, categoryId: number): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_move_thread", { p_thread: threadId, p_category: categoryId });
  if (error) return toActionError(error);
  revalidatePath(`/forum/t/${threadId}`);
  return { ok: true };
}
