"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, toActionError, type ActionResult } from "@/lib/errors";
import { fieldErrors } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export type AdminState = ActionResult | null;

const opt = z.string().trim().max(600).optional().transform((v) => (v ? v : null));
const testSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(80).optional().default(""),
  author: z.string().trim().min(2).max(120),
  organisation: opt,
  measures: z.string().trim().min(3).max(600),
  format: opt,
  item_count: z.string().optional().transform((v) => (v ? Number(v) : null)).pipe(z.number().int().min(1).max(1000).nullable()),
  difficulty: z.enum(["moderate", "hard", "very_hard", "extreme"]),
  ceiling: opt,
  duration: opt,
  cost: opt,
  is_free: z.enum(["yes", "no", "unknown"]).transform((v) => (v === "yes" ? true : v === "no" ? false : null)),
  supervised: z.boolean(),
  url: z.url().regex(/^https?:\/\//),
  link_status: z.enum(["ok", "unreachable"]),
  notes: z.string().trim().max(1200).optional().transform((v) => (v ? v : null)),
  score_scale: z.string().trim().min(2).max(40),
  position: z.coerce.number().int().min(0).max(10000),
  is_published: z.boolean(),
});

function read(formData: FormData) {
  return testSchema.safeParse({
    ...Object.fromEntries(formData),
    supervised: formData.get("supervised") === "on",
    is_published: formData.get("is_published") === "on",
  });
}

export async function saveTestAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const viewer = await requireAdmin();
  const parsed = read(formData);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return fail("invalid", Object.values(errors)[0], errors);
  }
  const id = String(formData.get("id") ?? "");
  const d = { ...parsed.data, slug: slugify(parsed.data.slug || parsed.data.name, 80) };
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("directory_tests").update(d).eq("id", id);
    if (error) return toActionError(error);
  } else {
    const { data, error } = await supabase.from("directory_tests").insert({ ...d, created_by: viewer.id }).select("id").single();
    if (error) return toActionError(error);
    await openDiscussion(data.id, d.name);
  }
  revalidatePath("/directory");
  revalidatePath(`/directory/${d.slug}`);
  redirect("/admin/directory?saved=1");
}

/** Every test gets a discussion thread in Test Discussions, opened by the staff account. */
async function openDiscussion(testId: string, name: string) {
  const admin = createAdminClient();
  const [{ data: staff }, { data: cat }] = await Promise.all([
    admin.from("profiles").select("id").eq("is_staff", true).order("created_at").limit(1).maybeSingle(),
    admin.from("forum_categories").select("id").eq("slug", "test-discussions").single(),
  ]);
  if (!cat) return;
  await admin.from("threads").insert({
    category_id: cat.id,
    author_id: staff?.id ?? null,
    title: `Discussion: ${name}`.slice(0, 140),
    body: `The room for **${name}**. Share your experience of the test, its norms and its ceiling.\n\nNo answers, hints or item discussion: that would spoil the test for everyone and breaks the community guidelines.`,
    tags: ["directory"],
    directory_test_id: testId,
    is_official: !!staff,
  });
}

export async function deleteTestAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("directory_tests").delete().eq("id", id);
  if (error) return toActionError(error);
  revalidatePath("/directory");
  redirect("/admin/directory?deleted=1");
}
