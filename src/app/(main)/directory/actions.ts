"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fail, toActionError, type ActionResult } from "@/lib/errors";
import { fieldErrors } from "@/lib/validation";

export type DirState = ActionResult | null;

const resultSchema = z
  .object({
    test_id: z.uuid(),
    slug: z.string().min(1),
    score: z.coerce.number({ error: "Enter your score." }).min(0, "Scores cannot be negative.").max(1000, "That score is out of range."),
    scale: z.enum(["iq15", "iq16", "iq24", "raw", "percentile"]),
    taken_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => new Date(v) <= new Date(), "The date cannot be in the future.")
      .optional()
      .or(z.literal("")),
    note: z.string().max(280).optional().default(""),
    proof_path: z.string().max(200).optional().or(z.literal("")),
    is_hidden: z.boolean(),
  })
  .refine((v) => v.scale !== "percentile" || v.score <= 100, { message: "A percentile is at most 100.", path: ["score"] })
  .refine((v) => !v.scale.startsWith("iq") || (v.score >= 40 && v.score <= 250), {
    message: "IQ scores are between 40 and 250 on this scale.",
    path: ["score"],
  });

export async function logResultAction(_: DirState, formData: FormData): Promise<DirState> {
  const viewer = await getViewer();
  if (!viewer?.profile.onboarded_at) return fail("unauthenticated", "Sign in to log a result.");
  const parsed = resultSchema.safeParse({
    test_id: formData.get("test_id"),
    slug: formData.get("slug"),
    score: formData.get("score"),
    scale: formData.get("scale"),
    taken_on: formData.get("taken_on") ?? "",
    note: formData.get("note") ?? "",
    proof_path: formData.get("proof_path") ?? "",
    is_hidden: formData.get("is_hidden") === "on",
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return fail("invalid", Object.values(errors)[0], errors);
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("test_results").insert({
    user_id: viewer.id,
    test_id: d.test_id,
    score: d.score,
    scale: d.scale,
    taken_on: d.taken_on || null,
    note: d.note.trim() || null,
    proof_path: d.proof_path || null,
    is_hidden: d.is_hidden,
  });
  if (error) return toActionError(error);
  revalidatePath(`/directory/${d.slug}`);
  revalidatePath(`/u/${viewer.profile.username}`);
  return { ok: true, message: "Logged. It appears on your profile marked as self-reported." };
}

export async function setResultHiddenAction(id: string, hidden: boolean, slug: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("unauthenticated", "Sign in first.");
  const supabase = await createClient();
  const { error } = await supabase.from("test_results").update({ is_hidden: hidden }).eq("id", id).eq("user_id", viewer.id);
  if (error) return toActionError(error);
  revalidatePath(`/directory/${slug}`);
  revalidatePath(`/u/${viewer.profile.username}`);
  return { ok: true };
}

export async function deleteResultAction(id: string, slug: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return fail("unauthenticated", "Sign in first.");
  const supabase = await createClient();
  const { data } = await supabase.from("test_results").select("proof_path").eq("id", id).eq("user_id", viewer.id).maybeSingle();
  const { error } = await supabase.from("test_results").delete().eq("id", id).eq("user_id", viewer.id);
  if (error) return toActionError(error);
  if (data?.proof_path) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    await admin.storage.from("proofs").remove([data.proof_path]);
    await admin.from("uploads").delete().eq("path", `proofs/${data.proof_path}`);
  }
  revalidatePath(`/directory/${slug}`);
  revalidatePath(`/u/${viewer.profile.username}`);
  return { ok: true };
}
