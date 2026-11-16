"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireModerator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, toActionError, type ActionResult } from "@/lib/errors";
import { flushEmailOutbox } from "@/lib/email";

const targetSchema = z.enum(["thread", "post", "message", "image", "test_result"]);

/** Remove (or restore) reported content. Images are also deleted from storage. */
export async function modRemoveContentAction(type: string, id: string, removed: boolean, reason: string): Promise<ActionResult> {
  await requireModerator();
  const t = targetSchema.safeParse(type);
  if (!t.success) return fail("invalid", "That content cannot be removed here.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_set_removed", { p_type: t.data, p_id: id, p_removed: removed, p_reason: reason || (null as unknown as string) });
  if (error) return toActionError(error);
  if (t.data === "image" && removed) {
    const [bucket, ...rest] = id.split("/");
    if (bucket && rest.length) await createAdminClient().storage.from(bucket).remove([rest.join("/")]);
  }
  after(() => flushEmailOutbox(5));
  revalidatePath("/mod");
  return { ok: true, message: removed ? "Removed." : "Restored." };
}

export async function resolveReportAction(reportId: number, status: "actioned" | "dismissed" | "open", note: string): Promise<ActionResult> {
  await requireModerator();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_resolve_report", { p_report: reportId, p_status: status, p_note: note || (null as unknown as string) });
  if (error) return toActionError(error);
  revalidatePath("/mod");
  return { ok: true };
}

const sanctionSchema = z.object({
  userId: z.uuid(),
  kind: z.enum(["warning", "mute", "ban"]),
  reason: z.string().trim().min(3, "Give a reason the member will see.").max(1000),
  hours: z.number().int().min(1).max(24 * 365).nullable(),
});

export async function sanctionAction(input: z.infer<typeof sanctionSchema>): Promise<ActionResult> {
  await requireModerator();
  const parsed = sanctionSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", parsed.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_sanction", {
    p_user: parsed.data.userId,
    p_kind: parsed.data.kind,
    p_reason: parsed.data.reason,
    p_hours: parsed.data.hours as number,
  });
  if (error) return toActionError(error);
  after(() => flushEmailOutbox(5));
  revalidatePath("/mod", "layout");
  return { ok: true, message: parsed.data.kind === "warning" ? "Warning sent." : parsed.data.kind === "mute" ? "Muted." : "Banned." };
}

export async function revokeSanctionAction(id: number): Promise<ActionResult> {
  await requireModerator();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_revoke_sanction", { p_sanction: id });
  if (error) return toActionError(error);
  revalidatePath("/mod", "layout");
  return { ok: true, message: "Lifted." };
}

export async function reviewResultAction(id: number, valid: boolean): Promise<ActionResult> {
  await requireModerator();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mod_review_result", { p_result: id, p_valid: valid, p_note: null as unknown as string });
  if (error) return toActionError(error);
  revalidatePath("/mod/flagged");
  return { ok: true };
}

export async function setRoleAction(userId: string, role: "member" | "moderator" | "admin"): Promise<ActionResult> {
  await requireModerator();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });
  if (error) return toActionError(error);
  revalidatePath("/mod", "layout");
  return { ok: true, message: "Role updated." };
}
