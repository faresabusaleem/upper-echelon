"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fail, toActionError, type ActionResult } from "@/lib/errors";
import { flushEmailOutbox } from "@/lib/email";

async function member() {
  const viewer = await getViewer();
  if (!viewer || !viewer.profile.onboarded_at) return null;
  return viewer;
}

export async function followAction(targetId: string, username: string): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail("unauthenticated", "Sign in to follow members.");
  const supabase = await createClient();
  const { error } = await supabase.from("follows").insert({ follower_id: viewer.id, followee_id: targetId });
  if (error && error.code !== "23505") return toActionError(error);
  after(() => flushEmailOutbox(5));
  revalidatePath(`/u/${username}`);
  return { ok: true };
}

export async function unfollowAction(targetId: string, username: string): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail("unauthenticated", "Sign in first.");
  const supabase = await createClient();
  const { error } = await supabase.from("follows").delete().eq("follower_id", viewer.id).eq("followee_id", targetId);
  if (error) return toActionError(error);
  revalidatePath(`/u/${username}`);
  return { ok: true };
}

export async function blockAction(targetId: string, block: boolean, path?: string): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail("unauthenticated", "Sign in first.");
  const supabase = await createClient();
  const { error } = block
    ? await supabase.from("blocks").insert({ blocker_id: viewer.id, blocked_id: targetId })
    : await supabase.from("blocks").delete().eq("blocker_id", viewer.id).eq("blocked_id", targetId);
  if (error && error.code !== "23505") return toActionError(error);
  if (path) revalidatePath(path);
  revalidatePath("/settings/privacy");
  return { ok: true, message: block ? "Blocked. Neither of you can follow or message the other." : "Unblocked." };
}

export async function muteAction(targetId: string, mute: boolean, path?: string): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail("unauthenticated", "Sign in first.");
  const supabase = await createClient();
  const { error } = mute
    ? await supabase.from("mutes").insert({ muter_id: viewer.id, muted_id: targetId })
    : await supabase.from("mutes").delete().eq("muter_id", viewer.id).eq("muted_id", targetId);
  if (error && error.code !== "23505") return toActionError(error);
  if (path) revalidatePath(path);
  revalidatePath("/settings/privacy");
  return { ok: true, message: mute ? "Muted. You will not be notified about them." : "Unmuted." };
}

const reportSchema = z.object({
  target_type: z.enum(["thread", "post", "profile", "message", "image", "test_result"]),
  target_id: z.string().min(1).max(300),
  reason: z.enum(["spam", "harassment", "hate", "sexual", "self_harm", "minor_safety", "violence", "cheating", "impersonation", "other"]),
  details: z.string().max(1000).optional(),
});

export async function reportAction(input: z.infer<typeof reportSchema>): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail("unauthenticated", "Sign in to report.");
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", "Choose a reason for the report.");
  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ ...parsed.data, details: parsed.data.details || null });
  if (error) {
    if (error.code === "23505") return { ok: true, message: "You have already reported this. The moderators will look at it." };
    return toActionError(error);
  }
  return { ok: true, message: "Thank you. A moderator will review it. You will not be named to the person you reported." };
}

export async function startConversationAction(targetId: string): Promise<ActionResult> {
  const viewer = await member();
  if (!viewer) return fail("unauthenticated", "Sign in to send messages.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", { other: targetId });
  if (error) return toActionError(error);
  redirect(`/messages/${data}`);
}
