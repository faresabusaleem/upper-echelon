import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NewThreadForm } from "@/components/forum/new-thread-form";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = { title: "Start a thread", robots: { index: false } };

export default async function NewThreadPage({ searchParams }: PageProps<"/forum/new">) {
  const viewer = await requireViewer({ next: "/forum/new" });
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: cats }, { data: draft }] = await Promise.all([
    supabase.from("forum_categories").select("id, name, is_advice, staff_only").order("position"),
    supabase.from("drafts").select("title, body, category_id").eq("user_id", viewer.id).is("thread_id", null).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const categories = (cats ?? []).filter((c) => !c.staff_only || viewer.isModerator || viewer.profile.is_staff);
  const initial = Number(sp.category) || null;
  return (
    <div className="mx-auto w-full max-w-4xl px-[var(--gutter)] pb-10 pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-small text-muted"><Link href="/forum" className="hover:text-ink">The Forum</Link></nav>
      <h1 className="mt-3 font-display text-display-l text-ink">Start a thread</h1>
      {viewer.mute ? (
        <Notice tone="warning" className="mt-8" title="You are muted.">
          You can read but not post until {viewer.mute.expires_at ? new Date(viewer.mute.expires_at).toUTCString() : "a moderator lifts the mute"}.
        </Notice>
      ) : (
        <div className="mt-10">
          <NewThreadForm categories={categories} initialCategory={initial} draft={draft} />
        </div>
      )}
    </div>
  );
}
