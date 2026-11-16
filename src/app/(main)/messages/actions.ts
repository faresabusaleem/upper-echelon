"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fail, toActionError, type ActionResult } from "@/lib/errors";
import { flushEmailOutbox } from "@/lib/email";

export async function sendMessageAction(conversationId: string, body: string): Promise<ActionResult<{ id: number; created_at: string }>> {
  const viewer = await getViewer();
  if (!viewer?.profile.onboarded_at) return fail("unauthenticated", "Sign in first.");
  const parsed = z.string().trim().min(1, "Write something first.").max(4000, "At most 4,000 characters.").safeParse(body);
  if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, body: parsed.data })
    .select("id, created_at")
    .single();
  if (error) return toActionError(error);
  after(() => flushEmailOutbox(5));
  revalidatePath("/messages");
  return { ok: true, data };
}

export async function markReadAction(conversationId: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) return;
  const supabase = await createClient();
  await supabase
    .from("conversation_state")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", viewer.id);
}

export async function deleteMessageAction(id: number, conversationId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("unauthenticated", "Sign in first.");
  const supabase = await createClient();
  const { error } = await supabase.from("messages").delete().eq("id", id).eq("sender_id", viewer.id);
  if (error) return toActionError(error);
  revalidatePath(`/messages/${conversationId}`);
  return { ok: true };
}

/** "Delete conversation": hides everything up to now for this member only. */
export async function clearConversationAction(conversationId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("unauthenticated", "Sign in first.");
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("conversation_state")
    .update({ cleared_at: now, last_read_at: now })
    .eq("conversation_id", conversationId)
    .eq("user_id", viewer.id);
  if (error) return toActionError(error);
  revalidatePath("/messages");
  redirect("/messages");
}
