import Link from "next/link";
import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ThreadRow, type ThreadListItem } from "@/components/forum/thread-row";
import { Empty } from "@/components/ui/empty";

export const metadata: Metadata = { title: "Bookmarks", robots: { index: false } };

export default async function BookmarksPage() {
  const viewer = await requireViewer({ next: "/forum/bookmarks" });
  const supabase = await createClient();
  const { data: marks } = await supabase.from("bookmarks").select("thread_id").eq("user_id", viewer.id).order("created_at", { ascending: false });
  const ids = (marks ?? []).map((m) => m.thread_id);
  const { data } = ids.length ? await supabase.from("thread_list").select("*").in("id", ids) : { data: [] };
  const byId = new Map((data ?? []).map((t) => [t.id, t]));
  const rows = ids.map((id) => byId.get(id)).filter(Boolean) as ThreadListItem[];
  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-small text-muted"><Link href="/forum" className="hover:text-ink">The Forum</Link></nav>
      <h1 className="mt-3 font-display text-display-l text-ink">Bookmarks</h1>
      {rows.length ? (
        <ul className="mt-8 flex flex-col">{rows.map((t) => <ThreadRow key={t.id} t={t} />)}</ul>
      ) : (
        <Empty className="mt-8" title="Nothing kept yet.">Bookmark a thread to find it here again.</Empty>
      )}
    </div>
  );
}
