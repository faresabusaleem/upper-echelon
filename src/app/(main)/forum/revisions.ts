"use server";

import { createClient } from "@/lib/supabase/server";

/** Earlier versions of a thread or reply (RLS: only for content the viewer can see). */
export async function getRevisionsAction(target: { threadId?: number; postId?: number }) {
  const supabase = await createClient();
  let q = supabase
    .from("revisions")
    .select("id, title, body, created_at, editor:profiles!revisions_edited_by_fkey(display_name)")
    .order("created_at", { ascending: false })
    .limit(30);
  q = target.threadId ? q.eq("thread_id", target.threadId) : q.eq("post_id", target.postId ?? -1);
  const { data } = await q;
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, body: r.body, created_at: r.created_at, editor: r.editor?.display_name ?? null }));
}
